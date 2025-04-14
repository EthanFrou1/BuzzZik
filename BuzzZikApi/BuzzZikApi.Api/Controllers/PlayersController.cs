using System.Linq;
using Microsoft.AspNetCore.Mvc;
using BuzzZikApi.Core.Data;
using BuzzZikApi.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace BuzzZikApi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlayersController : ControllerBase
    {
        private readonly BuzzZikDbContext _context;

        public PlayersController(BuzzZikDbContext context)
        {
            _context = context;
        }

        [HttpGet("{code}/players")]
        public IActionResult GetPlayersByGameCode(string code)
        {
            // 1. Récupérer la partie
            var game = _context.Games.FirstOrDefault(g => g.Code == code);

            if (game == null)
            {
                return NotFound(new { error = "Partie non trouvée" });
            }

            // 2. Récupérer tous les joueurs (plus simple)
            // Avec EF Core In-Memory, il est plus simple de charger tous les joueurs
            // et de faire le filtrage côté client
            var allPlayers = _context.Players.ToList();

            // 3. Récupérer toutes les équipes de la partie
            var teams = _context.Teams
                .Where(t => game.TeamIds.Contains(t.Id))
                .ToList();

            // 4. Filtrer les joueurs qui sont dans ces équipes ou qui n'ont pas encore d'équipe
            var playersInGame = allPlayers.Where(p =>
                teams.Any(t => t.PlayerIds.Contains(p.Id)) ||
                string.IsNullOrEmpty(p.TeamId)).ToList();

            return Ok(playersInGame);
        }
    }
}