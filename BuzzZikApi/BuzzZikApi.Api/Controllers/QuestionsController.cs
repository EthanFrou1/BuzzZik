using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using BuzzZikApi.Core.Data;
using BuzzZikApi.Core.Models;

namespace BuzzZikApi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : ControllerBase
    {
        private readonly BuzzZikDbContext _context;
        private readonly Random _random = new Random();

        public QuestionsController(BuzzZikDbContext context)
        {
            _context = context;
        }

        [HttpGet("generate/{theme}")]
        public IActionResult GenerateQuestion(string theme)
        {
            try
            {
                // Pour le MVP, nous simulons des questions générées
                // À terme, cela serait connecté à une API musicale ou une base de données

                // Liste des titres par thème (à étendre avec une vraie DB)
                var songs = GetSongsByTheme(theme);

                if (songs.Count < 4)
                {
                    return BadRequest(new { error = "Pas assez de chansons disponibles pour ce thème" });
                }

                // Choisir une chanson correcte aléatoirement
                int correctIndex = _random.Next(songs.Count);
                var correctSong = songs[correctIndex];

                // Créer une liste de 3 autres chansons incorrectes
                var wrongSongs = new List<string>();
                while (wrongSongs.Count < 3)
                {
                    int randomIndex = _random.Next(songs.Count);
                    if (randomIndex != correctIndex && !wrongSongs.Contains(songs[randomIndex]))
                    {
                        wrongSongs.Add(songs[randomIndex]);
                    }
                }

                // Créer les 4 réponses (mélangées)
                var answers = new List<string>();
                answers.Add(correctSong);
                answers.AddRange(wrongSongs);

                // Mélanger les réponses
                ShuffleList(answers);

                // Générer l'URL audio (fictive pour le MVP)
                string audioUrl = $"/audio/{theme.ToLower()}/{FormatForUrl(correctSong)}.mp3";

                // Créer et sauvegarder la question
                var question = new Question
                {
                    AudioUrl = audioUrl,
                    Answers = answers,
                    CorrectAnswer = correctSong
                };

                _context.Questions.Add(question);
                _context.SaveChanges();

                return Ok(question);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Méthode pour mélanger une liste (algorithme de Fisher-Yates)
        private void ShuffleList<T>(List<T> list)
        {
            int n = list.Count;
            while (n > 1)
            {
                n--;
                int k = _random.Next(n + 1);
                T value = list[k];
                list[k] = list[n];
                list[n] = value;
            }
        }

        // Formater un titre de chanson pour l'URL
        private string FormatForUrl(string title)
        {
            return title.ToLower()
                .Replace(" ", "_")
                .Replace("'", "")
                .Replace("\"", "")
                .Replace(",", "")
                .Replace(".", "");
        }

        // Obtenir la liste des chansons par thème
        private List<string> GetSongsByTheme(string theme)
        {
            // Ceci est une simulation pour le MVP
            // À terme, cela serait remplacé par une vraie DB ou API
            switch (theme.ToLower())
            {
                case "pop":
                    return new List<string> {
                        "Shape of You", "Blinding Lights", "Bad Guy", "Uptown Funk",
                        "Dance Monkey", "Someone Like You", "Levitating", "Don't Start Now",
                        "Watermelon Sugar", "As It Was", "Circles", "Dynamite"
                    };
                case "rap":
                    return new List<string> {
                        "Lose Yourself", "God's Plan", "SICKO MODE", "In Da Club",
                        "HUMBLE.", "Hotline Bling", "Dior", "Laugh Now Cry Later",
                        "Without Me", "XO Tour Llif3", "Industry Baby", "Lucid Dreams"
                    };
                case "années 2000":
                    return new List<string> {
                        "Toxic", "Hey Ya!", "Crazy In Love", "Mr. Brightside",
                        "I Gotta Feeling", "Hot N Cold", "Umbrella", "Since U Been Gone",
                        "Poker Face", "Yeah!", "In The End", "Can't Get You Out of My Head"
                    };
                case "disney":
                    return new List<string> {
                        "Let It Go", "A Whole New World", "Circle of Life", "How Far I'll Go",
                        "You've Got a Friend in Me", "Under the Sea", "Part of Your World", "Beauty and the Beast",
                        "Hakuna Matata", "I'll Make a Man Out of You", "Remember Me", "Surface Pressure"
                    };
                default:
                    // Fallback sur Pop si le thème n'est pas trouvé
                    return new List<string> {
                        "Shape of You", "Blinding Lights", "Bad Guy", "Uptown Funk",
                        "Dance Monkey", "Someone Like You", "Levitating", "Don't Start Now",
                        "Watermelon Sugar", "As It Was", "Circles", "Dynamite"
                    };
            }
        }

        [HttpGet("{id}")]
        public IActionResult GetQuestionById(string id)
        {
            var question = _context.Questions.Find(id);

            if (question == null)
            {
                return NotFound(new { error = "Question non trouvée" });
            }

            return Ok(question);
        }

        [HttpGet("game/{gameId}")]
        public IActionResult GetQuestionsByGameId(string gameId)
        {
            var game = _context.Games.FirstOrDefault(g => g.Id == gameId);

            if (game == null)
            {
                return NotFound(new { error = "Partie non trouvée" });
            }

            var questions = _context.Questions
                .Where(q => game.QuestionIds.Contains(q.Id))
                .ToList();

            return Ok(questions);
        }
    }
}