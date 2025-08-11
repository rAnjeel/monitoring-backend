module.exports = {
  apps: [
    {
        name: 'my-nest-app',  // Nom de votre application
        script: 'dist/main.js', // Point d'entrée après la compilation TS
        autorestart: true,    // Redémarrage automatique
        watch: false,         // Désactive le watch en prod
        ignore_watch: [
            'node_modules',  // Évite de surveiller les dépendances
            'test',         // Exclut les fichiers de tests
            'dist',         // Si vous travaillez en TypeScript
            '.env'          // Les modifications des variables nécessitent un redémarrage manuel
        ],
        max_memory_restart: '1G', // Limite mémoire
        env: {
            NODE_ENV: 'developpement',
            PORT: 3000,         // Port de l'application
        },
    },
  ],
};