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
            // 1. R�cup�rer la partie
            var game = _context.Games.FirstOrDefault(g => g.Code == code);

            if (game == null)
            {
                return NotFound(new { error = "Partie non trouv�e" });
            }

            // 2. R�cup�rer tous les joueurs (plus simple)
            // Avec EF Core In-Memory, il est plus simple de charger tous les joueurs
            // et de faire le filtrage c�t� client
            var allPlayers = _context.Players.ToList();

            // 3. R�cup�rer toutes les �quipes de la partie
            var teams = _context.Teams
                .Where(t => game.TeamIds.Contains(t.Id))
                .ToList();

            // 4. Filtrer les joueurs qui sont dans ces �quipes ou qui n'ont pas encore d'�quipe
            var playersInGame = allPlayers.Where(p =>
                teams.Any(t => t.PlayerIds.Contains(p.Id)) ||
                string.IsNullOrEmpty(p.TeamId)).ToList();

            return Ok(playersInGame);
        }
    }
}