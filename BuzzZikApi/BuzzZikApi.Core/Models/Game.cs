using System;
using System.Collections.Generic;

namespace BuzzZikApi.Core.Models
{
    public class Game
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Theme { get; set; } = "Pop";
        public int MaxRounds { get; set; } = 10;
        public int CurrentRound { get; set; } = 0;
        public string Status { get; set; } = "waiting"; // waiting, in_progress, paused, finished
        public string Code { get; set; }
        public List<string> TeamIds { get; set; } = new List<string>();
        public List<string> QuestionIds { get; set; } = new List<string>();
        public int RoundTimer { get; set; } = 30;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}