using System;
using System.Collections.Generic;

namespace BuzzZikApi.Core.Models
{
    public class Question
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string AudioUrl { get; set; } = string.Empty;
        public List<string> Answers { get; set; } = new List<string>();
        public string CorrectAnswer { get; set; } = string.Empty;
    }
}