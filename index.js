const { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GatewayIntentBits, Events, Colors, PermissionsBitField, SlashCommandBuilder, REST, Routes } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});


const DATA_FILE = "./data.json";


function getData() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ roleId: null }));
        return { roleId: null };
    }
    const rawData = fs.readFileSync(DATA_FILE);
    return JSON.parse(rawData);
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
// ----------------------------------------

client.on(Events.ClientReady, () => {
    console.log(`Client Ready: ${client.user.username}`);

    // สร้างคำสั่ง /setrole พร้อมช่องใส่ Role (addRoleOption)
    const com = new SlashCommandBuilder()
        .setName("setrole")
        .setDescription("ตั้งค่าว่าปุ่มจะแจกยศอะไร")
        .addRoleOption(option => 
            option.setName("role")
                .setDescription("เลือกยศที่ต้องการแจก")
                .setRequired(true)
        );

    const rest = new REST().setToken(process.env.TOKEN);
    (async () => {
        try {
            const commandsData = [ com.toJSON() ]; // ใส่ [] ครอบตามที่เคยแก้

            console.log(`Started refreshing application (/) commands.`);
            const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsData });
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    })();
});


client.on(Events.InteractionCreate, async (i) => {
    
    if (i.isChatInputCommand() && i.commandName === "setrole") {
        if (!i.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return i.reply({ content: "❌ You do not have permission to use this command!", ephemeral: true });
        }

        const selectedRole = i.options.getRole("role");
       
        saveData({ roleId: selectedRole.id });

        await i.reply({ content: `✅ Setup complete! The button will now give the role: **${selectedRole.name}**`, ephemeral: true });
    }

    // 2. ถ้าเป็นการกดปุ่ม (Button)
    if (i.isButton() && i.customId === "bt-1") {
        const data = getData();

        // ถ้ายังไม่ได้ตั้งค่า roleId
        if (!data.roleId) {
            return i.reply({ content: "⚠️ Admin has not set a role yet. Please use /setrole first.", ephemeral: true });
        }

        const role = i.guild.roles.cache.get(data.roleId);
        
        // ถ้ายศหายไปแล้ว (เช่น ถูกลบจากเซิร์ฟ)
        if (!role) {
            return i.reply({ content: "❌ This role no longer exists in the server.", ephemeral: true });
        }

        
        const member = i.member; 
        if (member.roles.cache.has(role.id)) {
            
            // await member.roles.remove(role);
            const embedhaverole = new EmbedBuilder().setTitle("Not").setDescription("You hane a role.").setColor(Colors.Default)
            await i.reply({ embeds: [embedhaverole], ephemeral: true });
        } else {
            
            await member.roles.add(role).catch(err => {
                const embederrrole = new EmbedBuilder().setTitle("Error").setDescription("❌ I cannot give this role. (My role might be lower than the target role)").setColor(Colors.Red)
                return i.reply({ embeds: [embederrrole], ephemeral: true });
            });
            
           
            if (!i.replied) {
                const ssrole = new EmbedBuilder().setTitle("ss").setDescription(`➕ You have received the role **${role.name}**!`).setColor(Colors.Orange)
                await i.reply({ embeds: [ssrole], ephemeral: true });
            }
        }
    }
});


client.on(Events.MessageCreate, (m) => {
    if (m.content === "s!setup-menu") {
        if (!m.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        
        m.delete().catch(e => console.log("delete error:" + e));

        const embed1 = new EmbedBuilder()
            .setTitle("Get Role")
            .setDescription("กดปุ่มด้านล่างเพื่อรับ")
            .setColor(Colors.Green);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("bt-1")
                .setLabel("GetRole")
                .setEmoji("🌐")
                .setStyle(ButtonStyle.Success)
        );

        m.channel.send({
            components: [row],
            embeds: [embed1]
        });
    }
});

client.login(process.env.TOKEN);