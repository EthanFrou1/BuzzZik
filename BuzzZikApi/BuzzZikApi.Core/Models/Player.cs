using System;

namespace BuzzZikApi.Core.Models
{
    public class Player
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public bool IsLeader { get; set; } = false;
        public bool IsConnected { get; set; } = true;
        public string TeamId { get; set; } = string.Empty; 
        public bool IsReady { get; set; } = false;
        public string ConnectionId { get; set; } = string.Empty;
    }
}