using System;

namespace BuzzZikApi.Core.Models
{
    public class Answer
    {
        public string TeamId { get; set; } = string.Empty;
        public string QuestionId { get; set; } = string.Empty;
        public string SelectedAnswer { get; set; } = string.Empty;
        public bool IsCorrect { get; set; } = false;
        public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
        public int TimeTaken { get; set; } = 0;
    }
}