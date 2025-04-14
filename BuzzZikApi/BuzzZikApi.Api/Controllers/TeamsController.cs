using System.Linq;
using Microsoft.AspNetCore.Mvc;
using BuzzZikApi.Core.Data;
using BuzzZikApi.Core.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System;

namespace BuzzZikApi.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TeamsController : ControllerBase
    {
        private readonly BuzzZikDbContext _context;

        public TeamsController(BuzzZikDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateTeam([FromBody] TeamCreateDto request)
        {
            try
            {
                var game = _context.Games.FirstOrDefault(g => g.Id == request.GameId);
                if (game == null)
                {
                    return NotFound(new { error = "Partie non trouv�e" });
                }

                var player = _context.Players.FirstOrDefault(p => p.Id == request.PlayerId);
                if (player == null)
                {
                    return NotFound(new { error = "Joueur non trouv�" });
                }

                var team = new Team
                {
                    Name = request.TeamName,
                    Avatar = request.Avatar
                };

                // Premier joueur de l'�quipe en devient le leader
                player.IsLeader = true;
                player.TeamId = team.Id;
                team.PlayerIds.Add(player.Id);

                game.TeamIds.Add(team.Id);

                _context.Teams.Add(team);
                await _context.SaveChangesAsync();

                return Ok(team);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        public class TeamCreateDto
        {
            public string GameId { get; set; }
            public string PlayerId { get; set; }
            public string TeamName { get; set; }
            public string Avatar { get; set; } = "cat";
        }

        [HttpGet("game/{gameId}")]
        public IActionResult GetTeamsByGameId(string gameId)
        {
            var game = _context.Games.FirstOrDefault(g => g.Id == gameId);
            if (game == null)
            {
                return NotFound(new { error = "Partie non trouv�e" });
            }

            var teams = _context.Teams
                .Where(t => game.TeamIds.Contains(t.Id))
                .ToList();

            return Ok(teams);
        }

        [HttpGet("{id}")]
        public IActionResult GetTeamById(string id)
        {
            var team = _context.Teams.Find(id);
            if (team == null)
            {
                return NotFound(new { error = "�quipe non trouv�e" });
            }

            return Ok(team);
        }

        [HttpGet("{id}/players")]
        public IActionResult GetPlayersByTeamId(string id)
        {
            var team = _context.Teams.Find(id);
            if (team == null)
            {
                return NotFound(new { error = "�quipe non trouv�e" });
            }

            // R�cup�rer tous les joueurs (plus simple avec la base en m�moire)
            var allPlayers = _context.Players.ToList();

            // Filtrer ceux qui appartiennent � cette �quipe
            var teamPlayers = allPlayers.Where(p => team.PlayerIds.Contains(p.Id)).ToList();

            return Ok(teamPlayers);
        }
    }
}