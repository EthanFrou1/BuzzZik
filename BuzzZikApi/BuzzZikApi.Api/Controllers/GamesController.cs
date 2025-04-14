using System;
using System.Linq;
using System.Threading.Tasks;
using BuzzZikApi.Core.Data;
using BuzzZikApi.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace BuzzZikApi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GamesController : ControllerBase
    {
        private readonly BuzzZikDbContext _context;

        public GamesController(BuzzZikDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateGame([FromBody] GameCreateDto request)
        {
            try
            {
                // Générer un code de partie unique (5 caractères)
                string gameCode;
                do
                {
                    gameCode = GenerateGameCode();
                } while (_context.Games.Any(g => g.Code == gameCode));

                var game = new Game
                {
                    Theme = request.Theme,
                    MaxRounds = request.MaxRounds,
                    Code = gameCode,
                    RoundTimer = request.RoundTimer ?? 30
                };

                // Créer deux équipes par défaut
                var equipe1 = new Team
                {
                    Name = "Équipe Rouge",
                    Avatar = "cat",
                    CurrentAnswer = null
                };

                var equipe2 = new Team
                {
                    Name = "Équipe Bleue",
                    Avatar = "dog",
                    CurrentAnswer = null
                };

                _context.Teams.Add(equipe1);
                _context.Teams.Add(equipe2);

                // Lier les équipes à la partie
                game.TeamIds.Add(equipe1.Id);
                game.TeamIds.Add(equipe2.Id);

                _context.Games.Add(game);
                await _context.SaveChangesAsync();

                return Ok(new { game.Id, game.Code });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{code}")]
        public IActionResult GetGameByCode(string code)
        {
            var game = _context.Games.FirstOrDefault(g => g.Code == code);

            if (game == null)
            {
                return NotFound(new { error = "Partie non trouvée" });
            }

            return Ok(game);
        }

        private string GenerateGameCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sans les caractères ambigus
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 5)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }

    public class GameCreateDto
    {
        public string Theme { get; set; } = "Pop";
        public int MaxRounds { get; set; } = 10;
        public int? RoundTimer { get; set; }
    }
}