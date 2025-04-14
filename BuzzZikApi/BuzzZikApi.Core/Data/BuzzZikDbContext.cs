using BuzzZikApi.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace BuzzZikApi.Core.Data
{
    public class BuzzZikDbContext : DbContext
    {
        public BuzzZikDbContext(DbContextOptions<BuzzZikDbContext> options) : base(options)
        {
        }

        public DbSet<Game> Games { get; set; }
        public DbSet<Team> Teams { get; set; }
        public DbSet<Player> Players { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<Answer> Answers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configuration pour Answer (clé composite)
            modelBuilder.Entity<Answer>()
                .HasKey(a => new { a.TeamId, a.QuestionId });

            // Ajoute d'autres configurations si nécessaire
            base.OnModelCreating(modelBuilder);
        }
    }
}