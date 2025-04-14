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

        public async Task JoinGame(string gameCode, string playerName)
        {
            try
            {
                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);

                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Le code de partie est invalide.");
                    return;
                }

                if (game.Status != "waiting")
                {
                    await Clients.Caller.SendAsync("Error", "La partie a d�j� commenc�.");
                    return;
                }

                // Cr�er un nouveau joueur
                var player = new Player
                {
                    Name = playerName,
                    ConnectionId = Context.ConnectionId,
                    IsConnected = true
                };

                _context.Players.Add(player);
                await _context.SaveChangesAsync();

                // Ajouter le joueur � un groupe SignalR pour cette partie
                await Groups.AddToGroupAsync(Context.ConnectionId, gameCode);

                // Si c'est le premier joueur, il devient le leader
                var playersInGame = _context.Players.Count(p => p.IsConnected);
                if (playersInGame == 1)
                {
                    player.IsLeader = true;
                    await _context.SaveChangesAsync();

                    // Cr�er deux �quipes par d�faut si aucune n'existe encore
                    var existingTeams = _context.Teams.Count(t => game.TeamIds.Contains(t.Id));
                    if (existingTeams == 0)
                    {
                        var team1 = new Team
                        {
                            Name = "�quipe Rouge",
                            Avatar = "cat",
                            CurrentAnswer = null
                        };

                        var team2 = new Team
                        {
                            Name = "�quipe Bleue",
                            Avatar = "dog",
                            CurrentAnswer = null
                        };

                        _context.Teams.Add(team1);
                        _context.Teams.Add(team2);

                        game.TeamIds.Add(team1.Id);
                        game.TeamIds.Add(team2.Id);

                        await _context.SaveChangesAsync();

                        // Assigner automatiquement le leader � la premi�re �quipe
                        player.TeamId = team1.Id;
                        team1.PlayerIds.Add(player.Id);
                        await _context.SaveChangesAsync();

                        // Notifier les clients de la cr�ation des �quipes
                        await Clients.Group(gameCode).SendAsync("TeamCreated", team1);
                        await Clients.Group(gameCode).SendAsync("TeamCreated", team2);
                    }
                    else
                    {
                        // S'il y a d�j� des �quipes, rejoindre celle qui a le moins de joueurs
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
                    // Pour les autres joueurs, les assigner � l'�quipe ayant le moins de joueurs
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

                // Notifier tout le monde de l'arriv�e d'un nouveau joueur
                await Clients.Group(gameCode).SendAsync("PlayerJoined", player);

                // Si le joueur a �t� assign� � une �quipe, notifier �galement
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
                    await Clients.Caller.SendAsync("Error", "Joueur non trouv�.");
                    return;
                }

                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Partie non trouv�e.");
                    return;
                }

                // V�rifier si le joueur est d�j� dans une �quipe
                if (!string.IsNullOrEmpty(player.TeamId))
                {
                    await Clients.Caller.SendAsync("Error", "Vous �tes d�j� dans une �quipe.");
                    return;
                }

                var team = new Team
                {
                    Name = teamName,
                    Avatar = avatar,
                    CurrentAnswer = null // Important: initialiser CurrentAnswer
                };

                // Premier joueur de l'�quipe en devient le leader
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
                    await Clients.Caller.SendAsync("Error", "Joueur non trouv�.");
                    return;
                }

                var team = _context.Teams.Find(teamId);
                if (team == null)
                {
                    await Clients.Caller.SendAsync("Error", "�quipe non trouv�e.");
                    return;
                }

                // Si le joueur est d�j� dans une �quipe, le retirer d'abord
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

        public async Task StartGame(string gameCode)
        {
            try
            {
                var player = _context.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (player == null || !player.IsLeader)
                {
                    await Clients.Caller.SendAsync("Error", "Seul le leader peut d�marrer la partie.");
                    return;
                }

                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
                if (game == null)
                {
                    await Clients.Caller.SendAsync("Error", "Partie non trouv�e.");
                    return;
                }

                if (game.TeamIds.Count < 1)
                {
                    await Clients.Caller.SendAsync("Error", "Il faut au moins une �quipe pour commencer.");
                    return;
                }

                // V�rifier que tous les joueurs ont rejoint une �quipe
                var playersNotInTeam = _context.Players
                    .Where(p => p.IsConnected && string.IsNullOrEmpty(p.TeamId))
                    .ToList();

                if (playersNotInTeam.Any())
                {
                    await Clients.Caller.SendAsync("Error", "Tous les joueurs doivent rejoindre une �quipe avant de commencer.");
                    return;
                }

                game.Status = "in_progress";
                game.CurrentRound = 1;
                await _context.SaveChangesAsync();

                // G�n�rer la premi�re question
                var question = GenerateQuestion(game.Theme);
                if (question != null)
                {
                    _context.Questions.Add(question);
                    game.QuestionIds.Add(question.Id);
                    await _context.SaveChangesAsync();
                }

                await Clients.Group(gameCode).SendAsync("GameStarted", game);

                // Envoyer la premi�re question
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

                    // D�marrer le timer pour la question
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
                    await Clients.Caller.SendAsync("Error", "Joueur non trouv�.");
                    return;
                }

                var team = _context.Teams.Find(player.TeamId);
                if (team == null)
                {
                    await Clients.Caller.SendAsync("Error", "�quipe non trouv�e.");
                    return;
                }

                var game = _context.Games.FirstOrDefault(g => g.Code == gameCode);
                if (game == null || game.Status != "in_progress")
                {
                    await Clients.Caller.SendAsync("Error", "Partie non trouv�e ou non en cours.");
                    return;
                }

                // V�rifier si c'est la premi�re r�ponse de l'�quipe pour cette question
                if (team.CurrentAnswer != null)
                {
                    // L'�quipe a d�j� r�pondu � cette question
                    return;
                }

                // R�cup�rer la question actuelle
                var currentQuestionId = game.QuestionIds.ElementAtOrDefault(game.CurrentRound - 1);
                if (string.IsNullOrEmpty(currentQuestionId))
                {
                    await Clients.Caller.SendAsync("Error", "Question non trouv�e.");
                    return;
                }

                var question = _context.Questions.Find(currentQuestionId);
                if (question == null)
                {
                    await Clients.Caller.SendAsync("Error", "Question non trouv�e.");
                    return;
                }

                // Enregistrer la r�ponse
                team.CurrentAnswer = answer;

                // V�rifier si la r�ponse est correcte
                bool isCorrect = answer == question.CorrectAnswer;

                // Calculer les points en fonction du temps restant (si impl�ment�)
                // Plus on r�pond vite, plus on gagne de points
                int timeTaken = 30; // � remplacer par le temps r�el si impl�ment�
                int points = 0;

                if (isCorrect)
                {
                    // Points de base pour une bonne r�ponse
                    points = 100;

                    // Bonus pour la rapidit�
                    points += Math.Max(0, (30 - timeTaken) * 10);

                    // Mettre � jour le score de l'�quipe
                    team.Score += points;
                }

                // Enregistrer la r�ponse dans la base de donn�es
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

                // Notifier uniquement le joueur/l'�quipe du r�sultat de sa r�ponse
                await Clients.Caller.SendAsync("AnswerRecorded", new
                {
                    isCorrect,
                    points,
                    answer
                });

                // V�rifier si toutes les �quipes ont r�pondu
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

                // Si toutes les �quipes ont r�pondu, passer � la question suivante
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
                    return;
                }

                // R�cup�rer la question actuelle
                var currentQuestionId = game.QuestionIds.ElementAtOrDefault(game.CurrentRound - 1);
                if (string.IsNullOrEmpty(currentQuestionId))
                {
                    return;
                }

                var question = _context.Questions.Find(currentQuestionId);
                if (question == null)
                {
                    return;
                }

                // Pr�parer les informations sur les �quipes pour l'affichage des r�sultats
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

                // Envoyer le r�sultat de la manche � tous les joueurs
                await Clients.Group(gameCode).SendAsync("RoundResult", new
                {
                    correctAnswer = question.CorrectAnswer,
                    teams = teamsInfo
                });

                // Attendre quelques secondes avant de passer � la question suivante
                await Task.Delay(5000);

                // R�initialiser les r�ponses des �quipes
                foreach (var teamId in game.TeamIds)
                {
                    var team = _context.Teams.Find(teamId);
                    if (team != null)
                    {
                        team.CurrentAnswer = null;
                    }
                }

                // Passer � la manche suivante
                game.CurrentRound++;

                // V�rifier si c'est la fin du jeu
                if (game.CurrentRound > game.MaxRounds)
                {
                    game.Status = "finished";
                    await _context.SaveChangesAsync();

                    // Envoyer les r�sultats finaux
                    await Clients.Group(gameCode).SendAsync("GameEnded");
                    return;
                }

                await _context.SaveChangesAsync();

                // G�n�rer et envoyer la nouvelle question
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

                    // D�marrer le timer pour la nouvelle question
                    _ = StartTimer(gameCode, game.RoundTimer);
                }
            }
            catch (Exception ex)
            {
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
        }

        // M�thode pour g�n�rer des questions (simplifi�e pour l'exemple)
        private Question GenerateQuestion(string theme)
        {
            // Liste simplifi� de chansons selon le th�me
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
                ["Ann�es 2000"] = new List<string> {
                    "Toxic", "Hey Ya!", "Crazy In Love", "Mr. Brightside",
                    "I Gotta Feeling", "Hot N Cold", "Umbrella", "Since U Been Gone"
                }
            };

            // Utiliser une liste par d�faut si le th�me n'existe pas
            if (!songs.ContainsKey(theme))
            {
                theme = "Pop";
            }

            // S�lectionner une chanson au hasard
            var random = new Random();
            var correctIndex = random.Next(songs[theme].Count);
            var correctSong = songs[theme][correctIndex];

            // Cr�er une liste de mauvaises r�ponses
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

            // M�langer les r�ponses
            var answers = new List<string> { correctSong };
            answers.AddRange(wrongAnswers);

            // M�langer les r�ponses
            for (int i = answers.Count - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                var temp = answers[i];
                answers[i] = answers[j];
                answers[j] = temp;
            }

            // Simuler une URL audio (dans une vraie impl�mentation, ce serait un vrai fichier)
            var audioUrl = $"/audio/{theme.ToLower()}/{correctSong.Replace(" ", "_").ToLower()}.mp3";

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