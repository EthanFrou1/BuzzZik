using BuzzZikApi.Api.Hubs;
using BuzzZikApi.Core.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Ajouter SignalR
builder.Services.AddSignalR();

// Ajouter le DbContext avec une base de données en mémoire
builder.Services.AddDbContext<BuzzZikDbContext>(options =>
    options.UseInMemoryDatabase("BuzzZikDb"));

// Ajouter CORS pour permettre les requêtes depuis le frontend React
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientPermission", policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .WithOrigins("http://localhost:5173") // URL correcte du frontend Vite (sans slash à la fin)
              .AllowCredentials();
    });
});

var app = builder.Build();

app.MapGet("/", () => Results.Redirect("/swagger"));

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Applique la politique CORS - position correcte
app.UseCors("ClientPermission");

app.UseAuthorization();

app.MapControllers();
app.MapHub<GameHub>("/gamehub");

app.Run();