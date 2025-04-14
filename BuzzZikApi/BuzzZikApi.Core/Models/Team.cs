using System;
using System.Collections.Generic;

namespace BuzzZikApi.Core.Models
{
    public class Team
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public int Score { get; set; } = 0;
        public List<string> PlayerIds { get; set; } = new List<string>();
        public string? CurrentAnswer { get; set; } = null;
    }
}   