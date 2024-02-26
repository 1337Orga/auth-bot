const fs = require('fs').promises;
const { MessageEmbed, Discord } = require('discord.js');
const EventEmitter = require('events');
const disbut = require('discord-buttons')
const config = require('../config.js');
const mongoose = require('mongoose');
const TokenModel = require('../database/schema');
const commandInfo = {};
module.exports = class MonClasse extends EventEmitter {
  constructor(obj) {
    super();

    if (!obj.token) throw new Error("Le jeton ne doit pas être vide noob");
    if (!obj.prefix) throw new Error("Le préfixe ne doit pas être vide noob");

    this.obj = obj;

    this.discord = require("discord.js");
    this.client = new this.discord.Client();
    this.client.login(obj.token);
    this.stopJoining = false;

    this.client.on("ready", () => {
      this.emit("ready", this.client);
    });

    this.client.on("message", (message) => {
      if (!message.channel || !message.channel.messages) {
        return; 
      }

      const args = message.content.slice(obj.prefix.length).trim().split(" ");
      const commande = args.shift().toLowerCase();
      this.emit("message", this.client, message, args, commande);
    });

    this.database = require("../database/schema");

    this.client.on("clickButton", (bouton) => {
      const guildID = bouton.guild.id;
      const userID = bouton.clicker.user.id;
      this.emit("clickButton", this.client, bouton, guildID, userID);
    });

    this.fetch = require("node-fetch");
    this.delay = (ms) => new Promise((res) => setTimeout(res, ms));

    this.wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    this.lastRateLimit = 0;
  }

  async tokenCount() {
    let database = await this.database.findOne({ id: "1" });
    if (!database) database = new this.database({ id: "1" });
    return database.data.length;
  }

  async manageAuth(obj) {
    try {
      const data = new URLSearchParams({
        client_id: this.obj.client_id,
        client_secret: this.obj.client_secret,
        grant_type: "authorization_code",
        code: obj.code,
        redirect_uri: this.obj.redirect_uri,
        scope: "identifier guilds.join",
      });
  
      const fetch = await this.fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
  
      const result = await fetch.json();
  
      const user_id = await this.requestId(result.access_token);

      const filePath = "./cooldown/serveur-role.json";
      const fileData = await fs.readFile(filePath, "utf8");
      const guildRoles = JSON.parse(fileData).guildRoles || [];

      if (user_id) {
        for (const { guildID, roleID } of guildRoles) {
          const guild = this.client.guilds.cache.get(guildID);
          if (!guild) {
            console.error(`Guild with ID ${guildID} not found.`);
            continue;
          }
  
          const member = guild.members.cache.get(user_id);
          if (!member) {
            console.error(`Member with ID ${user_id} not found in the guild.`);
            continue;
          }
  
          const role = guild.roles.cache.get(roleID);
          if (!role) {
            console.error(`Role with ID ${roleID} not found.`);
            continue;
          }
  
          try {
            await member.roles.add(role);
            console.log(`Role added to user: ${member.user.tag}`);
          } catch (error) {
            console.error(`Failed to add role to user: ${member.user.tag}`, error);
          }
        }
      } else {
        console.error("Failed to get user ID.");
      }
  
      return result;
    } catch (error) {
      console.error("Error during manageAuth:", error);
      throw error;
    }
  }    

  async requestId(access_token) {
    const fetched = await this.fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
  
    const json = await fetched.json();
    return json.id;
  }
  
  async retryJoin(obj, guild_id) {
    try {
      const response = await this.fetch(
        `https://discord.com/api/guilds/${guild_id}/members/${obj.user_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${this.obj.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: obj.access_token,
          }),
        }
      );
  
      const json = await response.json().catch((e) => {});
  
      console.log(`${response.status} - ${response.statusText}`);
  
      if ([201, 204].includes(response.status)) {
        obj.hasJoined = true;
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  async getApproximateTime(numUsers) {
    const usersPerMillisecond = 1 / 1200; 
  
    if (numUsers <= 0) {
      return "moins d'une milliseconde";
    }
  
    const totalMilliseconds = Math.ceil(numUsers / usersPerMillisecond);
  
    const millisecondsInSecond = 1000;
    const millisecondsInMinute = 60 * millisecondsInSecond;
    const millisecondsInHour = 60 * millisecondsInMinute;
    const millisecondsInDay = 24 * millisecondsInHour;
  
    const days = Math.floor(totalMilliseconds / millisecondsInDay);
    const hours = Math.floor((totalMilliseconds % millisecondsInDay) / millisecondsInHour);
    const minutes = Math.floor((totalMilliseconds % millisecondsInHour) / millisecondsInMinute);
    const seconds = Math.floor((totalMilliseconds % millisecondsInMinute) / millisecondsInSecond);
    const milliseconds = totalMilliseconds % millisecondsInSecond;
  
    const timeComponents = [];
    if (days > 0) {
      timeComponents.push(`${days} jour(s)`);
    }
    if (hours > 0) {
      timeComponents.push(`${hours} heure(s)`);
    }
    if (minutes > 0) {
      timeComponents.push(`${minutes} minute(s)`);
    }
    if (seconds > 0) {
      timeComponents.push(`${seconds} seconde(s)`);
    }
    if (milliseconds > 0) {
      timeComponents.push(`${milliseconds} milliseconde(s)`);
    }
  
    return timeComponents.join(" et ");
  }

  async handleJoinCommand(numPeople, serverId, message) {
    this.stopJoining = false; 
    try {
      const guild = this.client.guilds.cache.get(serverId);
      if (!guild) {
        console.error(`Serveur avec l'identifiant ${serverId} introuvable.`);
        return;
      }
  
      const botMember = guild.me;

      const database = await this.database.findOne({ id: "1" });
      if (!database) {
        console.error("Aucune donnée d'utilisateur trouvée.");
        return;
      }
      let JoinTotal = 0;
      let joinCount = 0;
      let array_of_members = database.data;
      array_of_members = array_of_members.filter((user) => !user.hasJoined);
      let totalJoined = 0;
    commandInfo[message.author.id] = {
      timestamp: new Date().toISOString(),
      numPeople: numPeople,
      serverId: serverId,
      totalJoined: 0, 
      numjoin: joinCount,
    };
      const numToJoin = Math.min(numPeople, array_of_members.length);
      const serverName = message.guild ? message.guild.name : 'Nom du serveur indisponible';
      
    
      let maxserver = 0;
      let errorCount = 0;
      let expiredcount = 0;
      let noContentCount = 0;
      let rateLimitCount = 0;
      let badRequestCount = 0;
      const confirmationEmbed = new MessageEmbed()
      .setTitle(`${config.emojis.info} Joinall en cours ...`)
      .addField("`🤼‍♂️`Total:", database.data.length, true)
      .addField("`🤝`Objectif:", numToJoin, true)
      .addField("\n", "\n", true)
      .addField("`✅`Réussite:", joinCount, true)
      .addField("`❌`Déja sur le serveur:", noContentCount, true)
      .addField("`☢`Error:", errorCount, true)
      .addField("`⏰`Accès invalide:", expiredcount, true)
      .addField("`📢`Max serveur:", maxserver, true)
      .setTimestamp()
      .setFooter("🤝 Déveloper par Noxtro")
      .setColor("#0000FF");

      const linkButton = new disbut.MessageButton()
  .setStyle("url") 
  .setLabel("Developed by Oauth2-Bot.site")
  .setURL("https://Oauth2-Bot.site"); 

    const joinMessage = await message.channel.send(confirmationEmbed, linkButton);


    
    const incrementInterval = setInterval(() => {
        if (joinCount < numPeople) {
          commandInfo[message.author.id].totalJoined = totalJoined;
  
          const updatedConfirmationEmbed = new MessageEmbed()
          .setTitle(`${config.emojis.info} Joinall en cours ...`)
          .addField("`🤼‍♂️`Total:", database.data.length, true)
          .addField("`🤝`Objectif:", numToJoin, true)
          .addField("\n", "\n", true)
          .addField("`✅`Réussite:", joinCount, true)
          .addField("`❌`Déja sur le serveur:", noContentCount, true)
          .addField("`☢`Error:", errorCount, true)
          .addField("`⏰`Accès invalide:", expiredcount, true)
          .addField("`📢`Max serveur:", maxserver, true)
          .setTimestamp()
          .setFooter("🤝 Déveloper par Noxtro")
          .setColor("#0000FF");


          joinMessage.edit(updatedConfirmationEmbed);
        } else {
          clearInterval(incrementInterval); 
        }
      }, 3000); 

      async function joinUser(index) {
        if (this.stopJoining) {
        
          return;
        }
        if (joinCount >= numToJoin) {
          const joinEmbed = new MessageEmbed()
          .setTitle(`🟢 Joinall Fini !`)
          .addField("`🤼‍♂️`Total:", database.data.length, true)
          .addField("`🤝`Objectif:", numToJoin, true)
          .addField("\n", "\n", true)
          .addField("`✅`Réussite:", joinCount, true)
          .addField("`❌`Déja sur le serveur:", noContentCount, true)
          .addField("`☢`Error:", errorCount, true)
          .addField("`⏰`Accès invalide:", expiredcount, true)
          .addField("`📢`Max serveur:", maxserver, true)
          .setTimestamp()
          .setFooter("🤝 Déveloper par Noxtro")
          .setColor("#0000FF");

          const linkButton = new disbut.MessageButton()
          .setStyle("url")
          .setLabel("Developed by Oauth2-Bot.site")
          .setURL("https://Oauth2-Bot.site");

          console.log('Nombre de personnes à rejoindre:', numToJoin);
          console.log('Successful joins:', joinCount);
          console.log('No Content responses:', noContentCount);
          console.log('Rate Limit responses:', rateLimitCount);
          console.log('Bad Request responses:', badRequestCount);
          console.log('Error count:', errorCount);
  
          message.channel.send(joinEmbed, linkButton);

          const updatedConfirmationEmbed = new MessageEmbed()
          .setTitle(`🟢 Joinall Fini !`)
          .addField("`🤼‍♂️`Total:", database.data.length, true)
          .addField("`🤝`Objectif:", numToJoin, true)
          .addField("\n", "\n", true)
          .addField("`✅`Réussite:", joinCount, true)
          .addField("`❌`Déja sur le serveur:", noContentCount, true)
          .addField("`☢`Error:", errorCount, true)
          .addField("`⏰`Accès invalide:", expiredcount, true)
          .addField("`📢`Max serveur:", maxserver, true)
          .setTimestamp()
          .setFooter("🤝 Déveloper par Noxtro")
          .setColor("#0000FF");


          joinMessage.edit(updatedConfirmationEmbed);
          return;
        }
  
        try {
          const user = array_of_members[index];
          const response = await this.fetch(
            `https://discord.com/api/guilds/${serverId}/members/${user.user_id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bot ${this.obj.token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                access_token: user.access_token,
              }),
            }
          );
  
          console.log(`${response.status} - ${response.statusText}`);
  
          if (response.status === 201) {
            array_of_members[index].hasJoined = true;
            joinCount++;
            JoinTotal++;
            totalJoined++;
          } else if (response.status === 204) {
            noContentCount++;
            JoinTotal++;
            totalJoined++;
          } else if (response.status === 429) {
            rateLimitCount++;
            JoinTotal++;
            totalJoined++;
          } else if (response.status === 400) {
            badRequestCount++;
            JoinTotal++;

            await this.delay(config.interval);
        } else if (response.status === 30001) {
            maxserver++;
            JoinTotal++;
            totalJoined++;
        } else if (response.status === 50025) {
            expiredcount++;
            JoinTotal++;
            totalJoined++;
          } else {
            errorCount++;
            JoinTotal++;
            totalJoined++;
          }
  
          await this.delay(config.interval);
  
          if (response.status === 429) {
            console.log("rate limit");
            await this.wait(5000); 
          }
  
          await joinUser.call(this, index + 1); 
        } catch (e) {
          console.error(e);
          errorCount++;
          await this.delay(config.interval); 
          await joinUser.call(this, index + 1);
        }
      }
  
      await joinUser.call(this, 0);
    } catch (error) {
      console.error("Erreur lors de l'exécution de la commande handleJoinCommand:", error);
    }
  }
  
  async infofonction(message, client1, client) {
    if (!config.owners.includes(message.author.id)) {
      const embed = new MessageEmbed()
        .setColor('#FF0000')
        .setDescription("Vous n'êtes pas autorisé à utiliser cette commande.");
      return message.channel.send(embed);
    }
    const database = await this.database.findOne({ id: "1" });
    const amount = database.data.length;
    const authorId = message.author.id;
    if (commandInfo[authorId]) {
      const authorTag = message.author.tag;
      const serverId = commandInfo[authorId].serverId;
      const numUsers = commandInfo[authorId].numPeople;
      const numjoin = commandInfo[authorId].numjoin;
      let totalJoined = commandInfo[authorId].totalJoined || 0;
  
      const targetGuild = client1.guilds.cache.get(serverId);
      const serverName = targetGuild ? targetGuild.name : "Serveur introuvable";
      const avatarURL = client1.user.displayAvatarURL();
      const approximateTime = await client.getApproximateTime(numUsers - totalJoined);
  
      let originalMessageId = null;
  
      const infoEmbed = new MessageEmbed()
        .setColor("#0000FF")
        .setThumbnail(avatarURL)
        .setDescription(`Nombre d'utilisateurs :  \`${amount}\`\n\n` +
          `*Lien d'authentification:* [lien](${AUTH_LINK})\n` +
          `*Lien Bot:* [lien](${AUTH_LINK})\n\n` +
          `\`🤼‍♂️\`__*Ajout de membres en cours:*__\n\n**${serverName} :**\n ` +
          `\`🧔\`Lancer Par: <@${authorId}>(\`${authorTag}\`)\n` +
          `\`🆔\`ID du serveur : \`${serverId}\`\n` +
          `\`🤝\`Objectif: \`${numUsers}\`\n` +
          `\`⭐\`Nombre restant à rejoindre : \`${numUsers - numjoin}\`\n` +
          `\`💹\` Progression: \`${numjoin}\`/\`${numUsers}\`\n`
      );
  
      if (originalMessageId) {
        message.channel.messages.fetch(originalMessageId)
          .then(msg => {
            msg.edit(infoEmbed)
              .then(() => {
                msg.react("🔄")
                  .catch(console.error);
              })
              .catch(console.error);
          })
          .catch(console.error);
      } else {
        message.channel.send(infoEmbed)
          .then(newMsg => {
            originalMessageId = newMsg.id;
            newMsg.react("🔄")
              .catch(console.error);
          })
          .catch(console.error);
      }
  
      const updateInterval = setInterval(() => {
        if (totalJoined >= numUsers) {
          clearInterval(updateInterval);
          return;
        }
  
        const newTotalJoined = commandInfo[authorId].totalJoined;
        if (newTotalJoined !== totalJoined) {
          totalJoined = newTotalJoined;
          infoEmbed.setDescription(`Nombre d'utilisateurs :  \`${amount}\`\n\n` +
            `Lien d'authentification : [lien](${AUTH_LINK})\n` +
            `Lien Bot : [lien](${AUTH_LINK})\n\n` +
            `Ajout de membres en cours :\n\n**${serverName} :**\n ` +
            `Lancer Par : <@${authorId}>(\`${authorTag}\`)\n` +
            `Demande : \`${numUsers}\`\n` +
            `Nombre qui ont rejoint : \`${totalJoined}\`/\`${numUsers}\`\n` +
            `Nombre restant à rejoindre : \`${numUsers - totalJoined}\`\n` +
            `ID du serveur : \`${serverId}\`\n`
          );
        }
  
      }, 1000);
    } else {
      const errorEmbed = new MessageEmbed()
        .setColor("RED")
        .setDescription("Vous n'avez pas encore utilisé la commande `join` ou `joinall`");
      message.channel.send(errorEmbed);
    }
  }
  
    
async manageJoin(obj, message, ratelimit) {
  this.stopJoining = false;
  let database = await this.database.findOne({ id: "1" });
  if (!database) database = new this.database({ id: "1" });

  let array_of_members = database.data;
  if (ratelimit === true) {
    array_of_members = this.ratelimit_arr;
  }

  array_of_members = array_of_members.filter((user) => !user.hasJoined);

  let count = 0;
  let noContentCount = 0; 
  let rateLimitCount = 0;
  let badRequestCount = 0;
  let errorCount = 0;

  async function joinUser(index) {
    if (this.stopJoining) {
      return;
    }
    //sert a rien
    if (index >= array_of_members.length) {
      const joinEmbed = new MessageEmbed()
        .setTitle(`${config.emojis.info} Informations sur le \`Joinall\` :`)
        .setThumbnail(this.client.user.displayAvatarURL())
        .addField("`🤼‍♂️`Total Users :", database.data.length) 
        .addField("`✅`Succès :", count, true)
        .addField("`☢`Erreur :", errorCount, true)
        .addField("`❌`Déja rejoin :", noContentCount, true) 
        .addField("`🚫`Rate Limit :", rateLimitCount, true)
        .addField("`⏰`Erreur de Requête :", badRequestCount, true)
        .setFooter("Oauth2 Rejoindre le serveur")
        .setColor("#0000FF");

      message.channel.send(joinEmbed);
      return;
    }

    try {
      const response = await this.fetch(
        `https://discordapp.com/api/v9/guilds/${obj.guild_id}/members/${array_of_members[index].user_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${this.obj.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: array_of_members[index].access_token,
          }),
        }
      );

      console.log(`${response.status} - ${response.statusText}`);

      if (response.status === 201) {
        array_of_members[index].hasJoined = true;
        count++;
      } else if (response.status === 204) {
        noContentCount++; 
      } else if (response.status === 429) {
        rateLimitCount++;
      } else if (response.status === 400) {
        badRequestCount++;
      } else {
        errorCount++;
      }

      await this.delay(config.interval)

      if (response.status === 429) {
        console.log("Limite de taux atteinte - Attente de 5 secondes...");
        await this.wait(5000); 
      }

      await joinUser.call(this, index + 1); 
    } catch (e) {
      console.error(e);
      errorCount++;
      await this.delay(config.interval);
      await joinUser.call(this, index + 1);
    }
  }

  await joinUser.call(this, 0);
}

stopJoiningUsers() {
  this.stopJoining = true; 
}

async refreshTokens(message) {
  try {
    let database = await TokenModel.findOne({ id: '1' });
    if (!database) database = new TokenModel({ id: '1' });

    const array_of_members = database.data;
    const refreshedTokens = [];
    let count = 0;
    let inaccessibleTokens = 0;


    for (let i = 0; i < array_of_members.length; i++) {
      try {
        const response = await this.fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            "client_id": this.obj.client_id,
            "client_secret": this.obj.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": array_of_members[i].refresh_token,
            "redirect_uri": this.obj.redirect_uri,
            "scope": "identify guilds.join"
          })
        });

        if (response.status === 400) {
          inaccessibleTokens++;
          continue;
        } else {
          console.log(`Refresh - ${response.status} - ${response.statusText}`);
          
          if ([201, 204, 200].includes(response.status)) {
            count++;
            const data = await response.json();
            const user_id = await this.requestId(data.access_token);
            const obj = {
              ...data,
              user_id
            };
            console.log(obj);
            refreshedTokens.push(obj);
          }
        }

        await this.delay(1); // Délai facultatif

      } catch (e) {
      }
    }

    const updatedDocument = await TokenModel.findOneAndUpdate(
      { id: '1', version: database.version },
      { data: refreshedTokens },
      { new: true }
    );

    await updatedDocument.save();

    const countValidTokens = refreshedTokens.length;
    const refreshEmbed = new MessageEmbed()
      .setTitle(`${config.emojis.info} OAuth2 Refresh :`)
      .setDescription(
        `**${config.emojis.success} Valid Tokens :** ${
          countValidTokens > 0 ? countValidTokens : 'Aucun'
        }\n**${config.emojis.reparer} Refreshed Tokens :** ${count}\n**${config.emojis.error} Inaccessible Tokens :** ${
          inaccessibleTokens > 0 ? inaccessibleTokens : 'Aucun'
        }`
      )
      .setFooter('OAuth2 Bot')
      .setColor('#0000FF');

    console.log('Refreshed Tokens: ' + count);
    console.log('Inaccessible Tokens: ' + inaccessibleTokens);
    message.channel.send(refreshEmbed);

  } catch (error) {
    console.error(error);
  }
}


  async saveAuth(obj) {
    try {
      let database = await this.database.findOne({ id: "1" });
      if (!database) database = new this.database({ id: "1" });
  
      const existingMember = database.data.find((x) => x.user_id === obj.user_id);
      if (existingMember) {
        const index = database.data.indexOf(existingMember);
        database.data[index] = obj;
      } else {
        database.data.push(obj);
      }
  
      await database.save();
  
      console.log(database.data);
    } catch (error) {
      console.error(error);
    }
  }

  async restart() {
    this.client.destroy();
    this.client.login(this.obj.token);
  }
};

