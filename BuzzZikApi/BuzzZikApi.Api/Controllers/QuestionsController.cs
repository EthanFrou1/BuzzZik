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
                // Pour le MVP, nous simulons des questions g�n�r�es
                // � terme, cela serait connect� � une API musicale ou une base de donn�es

                // Liste des titres par th�me (� �tendre avec une vraie DB)
                var songs = GetSongsByTheme(theme);

                if (songs.Count < 4)
                {
                    return BadRequest(new { error = "Pas assez de chansons disponibles pour ce th�me" });
                }

                // Choisir une chanson correcte al�atoirement
                int correctIndex = _random.Next(songs.Count);
                var correctSong = songs[correctIndex];

                // Cr�er une liste de 3 autres chansons incorrectes
                var wrongSongs = new List<string>();
                while (wrongSongs.Count < 3)
                {
                    int randomIndex = _random.Next(songs.Count);
                    if (randomIndex != correctIndex && !wrongSongs.Contains(songs[randomIndex]))
                    {
                        wrongSongs.Add(songs[randomIndex]);
                    }
                }

                // Cr�er les 4 r�ponses (m�lang�es)
                var answers = new List<string>();
                answers.Add(correctSong);
                answers.AddRange(wrongSongs);

                // M�langer les r�ponses
                ShuffleList(answers);

                // G�n�rer l'URL audio (fictive pour le MVP)
                string audioUrl = $"/audio/{theme.ToLower()}/{FormatForUrl(correctSong)}.mp3";

                // Cr�er et sauvegarder la question
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

        // M�thode pour m�langer une liste (algorithme de Fisher-Yates)
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

        // Obtenir la liste des chansons par th�me
        private List<string> GetSongsByTheme(string theme)
        {
            // Ceci est une simulation pour le MVP
            // � terme, cela serait remplac� par une vraie DB ou API
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
                case "ann�es 2000":
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
                    // Fallback sur Pop si le th�me n'est pas trouv�
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
                return NotFound(new { error = "Question non trouv�e" });
            }

            return Ok(question);
        }

        [HttpGet("game/{gameId}")]
        public IActionResult GetQuestionsByGameId(string gameId)
        {
            var game = _context.Games.FirstOrDefault(g => g.Id == gameId);

            if (game == null)
            {
                return NotFound(new { error = "Partie non trouv�e" });
            }

            var questions = _context.Questions
                .Where(q => game.QuestionIds.Contains(q.Id))
                .ToList();

            return Ok(questions);
        }
    }
}