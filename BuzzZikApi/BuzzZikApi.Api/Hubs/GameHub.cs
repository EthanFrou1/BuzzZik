using System;
using System.Threading.Tasks;
using BuzzZikApi.Core.Models;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Generic;
using System.Linq;
using BuzzZikApi.Core.Data;

namespace BuzzZikApi.Api.Hubs
{
    public class GameHub : Hub
    {
        private readonly BuzzZikDbContext _context;

        public GameHub(BuzzZikDbContext context)
        {
            _context = context;
        }

        public async Task JoinGame(string gameCode, string playerName, string previousConnectionId = null)
        {
            try
            {
                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);

                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Le code de partie est invalide.");
                    return;
                }

                // Vérifier si le joueur existe déjà (cas d'un refresh de page)
                var existingPlayer = !string.IsNullOrEmpty(previousConnectionId)
                    ? _context.Players.FirstOrDefault(p => p.ConnectionId == previousConnectionId)
                    : null;

                // Ajouter toujours au groupe SignalR, même si la partie a déjà commencé
                await Groups.AddToGroupAsync(Context.ConnectionId, gameCode);

                if (existingPlayer != null)
                {
                    // Mettre à jour le connectionId
                    existingPlayer.ConnectionId = Context.ConnectionId;
                    existingPlayer.IsConnected = true;
                    await _context.SaveChangesAsync();

                    // Si la partie est en cours, envoyer la question actuelle
                    if (game.Status == "in_progress")
                    {
                        var currentQuestionId = game.QuestionIds.ElementAtOrDefault(game.CurrentRound - 1);
                        if (!string.IsNullOrEmpty(currentQuestionId))
                        {
                            var question = _context.Questions.Find(currentQuestionId);
                            if (question != null)
                            {
                                await Clients.Caller.SendAsync("NewQuestion", new
                                {
                                    question,
                                    game = new
                                    {
                                        game.CurrentRound,
                                        game.MaxRounds,
                                        game.Theme,
                                        game.Status
                                    }
                                });

                                // Envoyer l'état actuel du timer
                                await Clients.Caller.SendAsync("TimerUpdate", game.RoundTimer);
                            }
                        }
                    }

                    // Informer les autres de la reconnexion
                    await Clients.Group(gameCode).SendAsync("PlayerReconnected", existingPlayer);
                    return;
                }

                // Si la partie est déjà en cours, permettre quand même de rejoindre pour les observateurs
                if (game.Status != "waiting")
                {
                    // Créer un nouveau joueur comme observateur
                    var observer = new Player
                    {
                        Name = playerName,
                        ConnectionId = Context.ConnectionId,
                        IsConnected = true,
                        IsReady = true // Automatiquement prêt pour ne pas bloquer
                    };

                    _context.Players.Add(observer);
                    await _context.SaveChangesAsync();

                    // Envoyer la question actuelle
                    var currentQuestionId = game.QuestionIds.ElementAtOrDefault(game.CurrentRound - 1);
                    if (!string.IsNullOrEmpty(currentQuestionId))
                    {
                        var question = _context.Questions.Find(currentQuestionId);
                        if (question != null)
                        {
                            await Clients.Caller.SendAsync("NewQuestion", new
                            {
                                question,
                                game = new
                                {
                                    game.CurrentRound,
                                    game.MaxRounds,
                                    game.Theme,
                                    game.Status
                                }
                            });
                        }
                    }

                    return;
                }

                // Créer un nouveau joueur
                var player = new Player
                {
                    Name = playerName,
                    ConnectionId = Context.ConnectionId,
                    IsConnected = true,
                    IsReady = false // Initialiser le joueur comme non prêt
                };

                _context.Players.Add(player);
                await _context.SaveChangesAsync();

                // Si c'est le premier joueur, il devient le leader
                var playersInGame = _context.Players.Count(p => p.IsConnected);
                if (playersInGame == 1)
                {
                    player.IsLeader = true;
                    await _context.SaveChangesAsync();

                    // Créer deux équipes par défaut si aucune n'existe encore
                    var existingTeams = _context.Teams.Count(t => game.TeamIds.Contains(t.Id));
                    if (existingTeams == 0)
                    {
                        var team1 = new Team
                        {
                            Name = "Équipe Rouge",
                            Avatar = "cat",
                            CurrentAnswer = null
                        };

                        var team2 = new Team
                        {
                            Name = "Équipe Bleue",
                            Avatar = "dog",
                            CurrentAnswer = null
                        };

                        _context.Teams.Add(team1);
                        _context.Teams.Add(team2);

                        game.TeamIds.Add(team1.Id);
                        game.TeamIds.Add(team2.Id);

                        await _context.SaveChangesAsync();

                        // Assigner automatiquement le leader à la première équipe
                        player.TeamId = team1.Id;
                        team1.PlayerIds.Add(player.Id);
                        await _context.SaveChangesAsync();

                        // Notifier les clients de la création des équipes
                        await Clients.Group(gameCode).SendAsync("TeamCreated", team1);
                        await Clients.Group(gameCode).SendAsync("TeamCreated", team2);
                    }
                    else
                    {
                        // S'il y a déjà des équipes, rejoindre celle qui a le moins de joueurs
                        var teams = _context.Teams
                            .Where(t => game.TeamIds.Contains(t.Id))
                            .OrderBy(t => t.PlayerIds.Count)
                            .ToList();

                        if (teams.Any())
                        {
                            var teamWithLeastPlayers = teams.First();
                            player.TeamId = teamWithLeastPlayers.Id;
                            teamWithLeastPlayers.PlayerIds.Add(player.Id);
                            await _context.SaveChangesAsync();
                        }
                    }
                }
                else
                {
                    // Pour les autres joueurs, les assigner à l'équipe ayant le moins de joueurs
                    var teams = _context.Teams
                        .Where(t => game.TeamIds.Contains(t.Id))
                        .OrderBy(t => t.PlayerIds.Count)
                        .ToList();

                    if (teams.Any())
                    {
                        var teamWithLeastPlayers = teams.First();
                        player.TeamId = teamWithLeastPlayers.Id;
                        teamWithLeastPlayers.PlayerIds.Add(player.Id);
                        await _context.SaveChangesAsync();
                    }
                }

                // Notifier tout le monde de l'arrivée d'un nouveau joueur
                await Clients.Group(gameCode).SendAsync("PlayerJoined", player);

                // Si le joueur a été assigné à une équipe, notifier également
                if (!string.IsNullOrEmpty(player.TeamId))
                {
                    var team = _context.Teams.Find(player.TeamId);
                    if (team != null)
                    {
                        await Clients.Group(gameCode).SendAsync("PlayerJoinedTeam", new { player, team });
                    }
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
            }
        }

        public async Task CreateTeam(string gameCode, string teamName, string avatar)
        {
            try
            {
                var player = _context.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player == null)
                {
                    await Clients.Caller.SendAsync("Error", "Joueur non trouvé.");
                    return;
                }

                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Partie non trouvée.");
                    return;
                }

                // Vérifier si le joueur est déjà dans une équipe
                if (!string.IsNullOrEmpty(player.TeamId))
                {
                    await Clients.Caller.SendAsync("Error", "Vous êtes déjà dans une équipe.");
                    return;
                }

                var team = new Team
                {
                    Name = teamName,
                    Avatar = avatar,
                    CurrentAnswer = null // Important: initialiser CurrentAnswer
                };

                // Premier joueur de l'équipe en devient le leader
                player.IsLeader = true;
                player.TeamId = team.Id;
                team.PlayerIds.Add(player.Id);

                game.TeamIds.Add(team.Id);

                _context.Teams.Add(team);
                await _context.SaveChangesAsync();

                await Clients.Group(gameCode).SendAsync("TeamCreated", team);
                await Clients.Group(gameCode).SendAsync("PlayerJoinedTeam", new { player, team });
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
            }
        }

        public async Task JoinTeam(string teamId)
        {
            try
            {
                var player = _context.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player == null)
                {
                    await Clients.Caller.SendAsync("Error", "Joueur non trouvé.");
                    return;
                }

                var team = _context.Teams.Find(teamId);
                if (team == null)
                {
                    await Clients.Caller.SendAsync("Error", "Équipe non trouvée.");
                    return;
                }

                // Si le joueur est déjà dans une équipe, le retirer d'abord
                if (!string.IsNullOrEmpty(player.TeamId))
                {
                    var oldTeam = _context.Teams.Find(player.TeamId);
                    if (oldTeam != null && oldTeam.PlayerIds.Contains(player.Id))
                    {
                        oldTeam.PlayerIds.Remove(player.Id);
                    }
                }

                player.TeamId = teamId;
                team.PlayerIds.Add(player.Id);

                // Réinitialiser le statut prêt quand on change d'équipe
                player.IsReady = false;

                await _context.SaveChangesAsync();

                var gameCode = _context.Games
                    .FirstOrDefault(g => g.TeamIds.Contains(teamId))?.Code;

                if (!string.IsNullOrEmpty(gameCode))
                {
                    await Clients.Group(gameCode).SendAsync("PlayerJoinedTeam", new { player, team });
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
            }
        }

        // Nouvelle méthode pour marquer un joueur comme prêt
        public async Task SetPlayerReady(bool isReady)
        {
            try
            {
                var player = _context.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player == null)
                {
                    await Clients.Caller.SendAsync("Error", "Joueur non trouvé.");
                    return;
                }

                // Ne peut pas se mettre prêt si pas dans une équipe
                if (string.IsNullOrEmpty(player.TeamId))
                {
                    await Clients.Caller.SendAsync("Error", "Vous devez rejoindre une équipe avant de vous marquer comme prêt.");
                    return;
                }

                player.IsReady = isReady;
                await _context.SaveChangesAsync();

                // Trouver le code de la partie du joueur
                var team = _context.Teams.Find(player.TeamId);
                if (team == null) return; // Le joueur n'est pas dans une équipe

                var gameCode = _context.Games
                    .FirstOrDefault(g => g.TeamIds.Contains(team.Id))?.Code;

                if (!string.IsNullOrEmpty(gameCode))
                {
                    await Clients.Group(gameCode).SendAsync("PlayerReadyChanged", player);
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
            }
        }

        public async Task StartGame(string gameCode)
        {
            try
            {
                var player = _context.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player == null || !player.IsLeader)
                {
                    await Clients.Caller.SendAsync("Error", "Seul le leader peut démarrer la partie.");
                    return;
                }

                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Partie non trouvée.");
                    return;
                }

                if (game.TeamIds.Count < 1)
                {
                    await Clients.Caller.SendAsync("Error", "Il faut au moins une équipe pour commencer.");
                    return;
                }

                // Vérifier que tous les joueurs ont rejoint une équipe
                var playersNotInTeam = _context.Players
                    .Where(p => p.IsConnected && string.IsNullOrEmpty(p.TeamId))
                    .ToList();

                if (playersNotInTeam.Any())
                {
                    await Clients.Caller.SendAsync("Error", "Tous les joueurs doivent rejoindre une équipe avant de commencer.");
                    return;
                }

                // Vérifier que tous les joueurs sont prêts
                var playersNotReady = _context.Players
                    .Where(p => p.IsConnected && !string.IsNullOrEmpty(p.TeamId) && !p.IsReady)
                    .ToList();

                if (playersNotReady.Any())
                {
                    await Clients.Caller.SendAsync("Error", "Tous les joueurs doivent être prêts pour commencer.");
                    return;
                }

                game.Status = "in_progress";
                game.CurrentRound = 1;
                await _context.SaveChangesAsync();

                // Générer la première question
                var question = GenerateQuestion(game.Theme);
                if (question != null)
                {
                    _context.Questions.Add(question);
                    game.QuestionIds.Add(question.Id);
                    await _context.SaveChangesAsync();
                }

                await Clients.Group(gameCode).SendAsync("GameStarted", game);

                // Envoyer la première question
                if (question != null)
                {
                    await Clients.Group(gameCode).SendAsync("NewQuestion", new
                    {
                        question,
                        game = new
                        {
                            game.CurrentRound,
                            game.MaxRounds,
                            game.Theme,
                            game.Status
                        }
                    });

                    // Démarrer le timer pour la question
                    _ = StartTimer(gameCode, game.RoundTimer);
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
            }
        }

        public async Task SubmitAnswer(string gameCode, string answer)
        {
            try
            {
                var player = _context.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player == null)
                {
                    await Clients.Caller.SendAsync("Error", "Joueur non trouvé.");
                    return;
                }

                var team = _context.Teams.Find(player.TeamId);
                if (team == null)
                {
                    await Clients.Caller.SendAsync("Error", "Équipe non trouvée.");
                    return;
                }

                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
                if (game == null || game.Status != "in_progress")
                {
                    await Clients.Caller.SendAsync("Error", "Partie non trouvée ou non en cours.");
                    return;
                }

                // Vérifier si c'est la première réponse de l'équipe pour cette question
                if (team.CurrentAnswer != null)
                {
                    // L'équipe a déjà répondu à cette question
                    return;
                }

                // Récupérer la question actuelle
                var currentQuestionId = game.QuestionIds.ElementAtOrDefault(game.CurrentRound - 1);
                if (string.IsNullOrEmpty(currentQuestionId))
                {
                    await Clients.Caller.SendAsync("Error", "Question non trouvée.");
                    return;
                }

                var question = _context.Questions.Find(currentQuestionId);
                if (question == null)
                {
                    await Clients.Caller.SendAsync("Error", "Question non trouvée.");
                    return;
                }

                // Enregistrer la réponse
                team.CurrentAnswer = answer;

                // Vérifier si la réponse est correcte
                bool isCorrect = answer == question.CorrectAnswer;

                // Calculer les points en fonction du temps restant (si implémenté)
                // Plus on répond vite, plus on gagne de points
                int timeTaken = 30; // À remplacer par le temps réel si implémenté
                int points = 0;

                if (isCorrect)
                {
                    // Points de base pour une bonne réponse
                    points = 100;

                    // Bonus pour la rapidité
                    points += Math.Max(0, (30 - timeTaken) * 10);

                    // Mettre à jour le score de l'équipe
                    team.Score += points;
                }

                // Enregistrer la réponse dans la base de données
                var answerRecord = new Answer
                {
                    TeamId = team.Id,
                    QuestionId = question.Id,
                    SelectedAnswer = answer,
                    IsCorrect = isCorrect,
                    TimeTaken = timeTaken
                };

                _context.Answers.Add(answerRecord);
                await _context.SaveChangesAsync();

                // Notifier uniquement le joueur/l'équipe du résultat de sa réponse
                await Clients.Caller.SendAsync("AnswerRecorded", new
                {
                    isCorrect,
                    points,
                    answer
                });

                // Vérifier si toutes les équipes ont répondu
                bool allTeamsAnswered = true;
                foreach (var teamId in game.TeamIds)
                {
                    var t = _context.Teams.Find(teamId);
                    if (t != null && t.CurrentAnswer == null)
                    {
                        allTeamsAnswered = false;
                        break;
                    }
                }

                // Si toutes les équipes ont répondu, passer à la question suivante
                if (allTeamsAnswered)
                {
                    await RoundEnd(gameCode);
                }
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("Error", $"Erreur: {ex.Message}");
            }
        }

        private async Task RoundEnd(string gameCode)
        {
            try
            {
                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
                if (game == null)
                {
                    Console.WriteLine($"RoundEnd: Jeu introuvable pour le code {gameCode}");
                    return;
                }

                // Récupérer la question actuelle
                var currentQuestionId = game.QuestionIds.ElementAtOrDefault(game.CurrentRound - 1);
                if (string.IsNullOrEmpty(currentQuestionId))
                {
                    Console.WriteLine($"RoundEnd: Question introuvable pour la manche {game.CurrentRound}");
                    return;
                }

                var question = _context.Questions.Find(currentQuestionId);
                if (question == null)
                {
                    Console.WriteLine($"RoundEnd: Question introuvable pour l'ID {currentQuestionId}");
                    return;
                }

                Console.WriteLine($"RoundEnd: Fin de la manche {game.CurrentRound} pour la partie {gameCode}");


                // Préparer les informations sur les équipes pour l'affichage des résultats
                var teamsInfo = _context.Teams
                    .Where(t => game.TeamIds.Contains(t.Id))
                    .Select(t => new
                    {
                        t.Id,
                        t.Name,
                        t.Score,
                        t.CurrentAnswer,
                        isCorrect = t.CurrentAnswer == question.CorrectAnswer
                    })
                    .ToList();

                // Envoyer le résultat de la manche à tous les joueurs
                await Clients.Group(gameCode).SendAsync("RoundResult", new
                {
                    correctAnswer = question.CorrectAnswer,
                    teams = teamsInfo
                });

                // Attendre quelques secondes avant de passer à la question suivante
                await Task.Delay(5000);

                // Réinitialiser les réponses des équipes
                foreach (var teamId in game.TeamIds)
                {
                    var team = _context.Teams.Find(teamId);
                    if (team != null)
                    {
                        team.CurrentAnswer = null;
                    }
                }

                // Passer à la manche suivante
                game.CurrentRound++;

                // Vérifier si c'est la fin du jeu
                if (game.CurrentRound > game.MaxRounds)
                {
                    game.Status = "finished";
                    await _context.SaveChangesAsync();

                    // Envoyer les résultats finaux
                    await Clients.Group(gameCode).SendAsync("GameEnded");
                    return;
                }

                await _context.SaveChangesAsync();

                // Générer et envoyer la nouvelle question
                var nextQuestion = GenerateQuestion(game.Theme);
                if (nextQuestion != null)
                {
                    _context.Questions.Add(nextQuestion);
                    game.QuestionIds.Add(nextQuestion.Id);
                    await _context.SaveChangesAsync();

                    await Clients.Group(gameCode).SendAsync("NewQuestion", new
                    {
                        question = nextQuestion,
                        game = new
                        {
                            game.CurrentRound,
                            game.MaxRounds,
                            game.Theme,
                            game.Status
                        }
                    });

                    // Démarrer le timer pour la nouvelle question
                    _ = StartTimer(gameCode, game.RoundTimer);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur dans RoundEnd: {ex.Message}");
                await Clients.Group(gameCode).SendAsync("Error", $"Erreur: {ex.Message}");
            }
        }

        private async Task StartTimer(string gameCode, int seconds)
        {
            for (int i = seconds; i >= 0; i--)
            {
                await Clients.Group(gameCode).SendAsync("TimerUpdate", i);
                await Task.Delay(1000);
            }

            // À la fin du timer, si les équipes n'ont pas toutes répondu, forcer la fin de la manche
            var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
            if (game != null && game.Status == "in_progress")
            {
                bool allTeamsAnswered = true;
                foreach (var teamId in game.TeamIds)
                {
                    var team = _context.Teams.Find(teamId);
                    if (team != null && team.CurrentAnswer == null)
                    {
                        allTeamsAnswered = false;
                        break;
                    }
                }

                // Si toutes les équipes n'ont pas répondu, forcer la fin de la manche
                if (!allTeamsAnswered)
                {
                    await RoundEnd(gameCode);
                }
            }
        }

        // Méthode pour générer des questions (simplifiée pour l'exemple)
        private Question GenerateQuestion(string theme)
        {
            // Liste simplifié de chansons selon le thème
            var songs = new Dictionary<string, List<string>>
            {
                ["Pop"] = new List<string> {
                    "Shape of You", "Blinding Lights", "Bad Guy", "Uptown Funk",
                    "Dance Monkey", "Someone Like You", "Levitating", "Don't Start Now"
                },
                ["Rap"] = new List<string> {
                    "Lose Yourself", "God's Plan", "SICKO MODE", "In Da Club",
                    "HUMBLE.", "Hotline Bling", "Dior", "Laugh Now Cry Later"
                },
                ["Années 2000"] = new List<string> {
                    "Toxic", "Hey Ya!", "Crazy In Love", "Mr. Brightside",
                    "I Gotta Feeling", "Hot N Cold", "Umbrella", "Since U Been Gone"
                }
            };

            // Utiliser une liste par défaut si le thème n'existe pas
            if (!songs.ContainsKey(theme))
            {
                theme = "Pop";
            }

            // Sélectionner une chanson au hasard
            var random = new Random();
            var correctIndex = random.Next(songs[theme].Count);
            var correctSong = songs[theme][correctIndex];

            // Créer une liste de mauvaises réponses
            var wrongAnswers = new List<string>();
            var allSongs = songs.Values.SelectMany(x => x).ToList();

            while (wrongAnswers.Count < 3)
            {
                int randomIndex = random.Next(allSongs.Count);
                var song = allSongs[randomIndex];

                if (song != correctSong && !wrongAnswers.Contains(song))
                {
                    wrongAnswers.Add(song);
                }
            }

            // Mélanger les réponses
            var answers = new List<string> { correctSong };
            answers.AddRange(wrongAnswers);

            // Mélanger les réponses
            for (int i = answers.Count - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                var temp = answers[i];
                answers[i] = answers[j];
                answers[j] = temp;
            }

            // Simuler une URL audio (dans une vraie implémentation, ce serait un vrai fichier)
            var audioUrl = $"/audio/{theme.ToLower().Replace("é", "e").Replace("è", "e")}.mp4";

            return new Question
            {
                AudioUrl = audioUrl,
                Answers = answers,
                CorrectAnswer = correctSong
            };
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var player = _context.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
            if (player != null)
            {
                player.IsConnected = false;
                await _context.SaveChangesAsync();

                // Trouver la partie et notifier les autres
                var team = _context.Teams.Find(player.TeamId);
                if (team != null)
                {
                    var gameId = _context.Games
                        .FirstOrDefault(g => g.TeamIds.Contains(team.Id))?.Code;

                    if (!string.IsNullOrEmpty(gameId))
                    {
                        await Clients.Group(gameId).SendAsync("PlayerDisconnected", player);
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}