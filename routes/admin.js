const express = require('express');
const router = express.Router();
const settings = require('../settings.json');
const fetch = require('node-fetch');
const db = require('../app').db;

// Get all users API endpoint
router.get('/api/users', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        console.log('Fetching users from Pterodactyl...');
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/users?include=servers`, {
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch users from Pterodactyl:', response.statusText);
            return res.status(500).json({ error: 'Failed to fetch users from Pterodactyl' });
        }

        const data = await response.json();
        console.log('Successfully fetched users from Pterodactyl');

        // Transform the data to match the expected format
        const users = data.data.map(user => {
            // Get the user's servers
            const servers = user.relationships?.servers?.data || [];
            
            // Calculate total resources from servers
            const totalResources = servers.reduce((acc, server) => {
                return {
                    ram: acc.ram + (server.attributes.limits.memory || 0),
                    disk: acc.disk + (server.attributes.limits.disk || 0),
                    cpu: acc.cpu + (server.attributes.limits.cpu || 0)
                };
            }, { ram: 0, disk: 0, cpu: 0 });

            return {
                discordId: user.attributes.external_id,
                username: user.attributes.username,
                avatar: user.attributes.avatar ? `https://cdn.discordapp.com/avatars/${user.attributes.external_id}/${user.attributes.avatar}` : 'https://i.imgur.com/GY3cXet.png',
                ram: totalResources.ram,
                disk: totalResources.disk,
                cpu: totalResources.cpu,
                servers: servers.length,
                coins: 0 // You might want to fetch this from your database if needed
            };
        });

        console.log('Sending user data:', users);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Render users page
router.get('/users', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.redirect('/login');
    }

    try {
        res.render('admin/users', {
            settings: settings,
            req: req
        });
    } catch (error) {
        console.error('Error rendering users page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get single user
router.get('/users/:discordId', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const discordId = req.params.discordId;
        const pteroId = await db.get(`users-${discordId}`);
        
        if (!pteroId) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userInfo = await fetch(`${settings.pterodactyl.domain}/api/application/users/${pteroId}`, {
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        }).then(res => res.json());

        const extra = await db.get(`extra-${discordId}`) || {
            ram: 0,
            disk: 0,
            cpu: 0,
            servers: 0
        };

        const coins = await db.get(`coins-${discordId}`) || 0;

        res.json({
            discordId,
            username: userInfo.attributes.username,
            avatar: userInfo.attributes.avatar,
            ram: extra.ram,
            disk: extra.disk,
            cpu: extra.cpu,
            servers: extra.servers,
            coins
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user
router.put('/users/:discordId', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const discordId = req.params.discordId;
        const { ram, disk, cpu, servers, coins } = req.body;

        // Update extra resources
        await db.set(`extra-${discordId}`, {
            ram: parseInt(ram) || 0,
            disk: parseInt(disk) || 0,
            cpu: parseInt(cpu) || 0,
            servers: parseInt(servers) || 0
        });

        // Update coins
        await db.set(`coins-${discordId}`, parseInt(coins) || 0);

        // Check if user is over their limits
        await adminjs.suspend(discordId);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Render settings page
router.get('/settings', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.redirect('/login');
    }

    try {
        res.render('admin/settings', {
            settings: settings,
            req: req
        });
    } catch (error) {
        console.error('Error rendering settings page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update settings API endpoint
router.put('/api/settings', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const settingsPath = path.join(__dirname, '..', 'settings.json');
        const updatedSettings = req.body;

        // Read current settings
        const currentSettings = JSON.parse(fs.readFileSync(settingsPath));

        // Update nested settings
        Object.keys(updatedSettings).forEach(key => {
            const keys = key.split('.');
            let current = currentSettings;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = updatedSettings[key];
        });

        // Write updated settings back to file
        fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 4));

        // Update settings in memory
        Object.assign(settings, currentSettings);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Render servers page
router.get('/servers', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.redirect('/login');
    }

    try {
        res.render('admin/servers', {
            settings: settings,
            req: req
        });
    } catch (error) {
        console.error('Error rendering servers page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get all servers API endpoint
router.get('/api/servers', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/servers?include=allocations,user`, {
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch servers: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching servers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Suspend server
router.post('/api/servers/:id/suspend', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/servers/${req.params.id}/suspend`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to suspend server: ${response.statusText}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error suspending server:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Unsuspend server
router.post('/api/servers/:id/unsuspend', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/servers/${req.params.id}/unsuspend`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to unsuspend server: ${response.statusText}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error unsuspending server:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete server
router.delete('/api/servers/:id', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/servers/${req.params.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete server: ${response.statusText}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting server:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Render server creation page
router.get('/servers/create', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.redirect('/login');
    }

    try {
        res.render('admin/servers/create', {
            settings: settings,
            req: req
        });
    } catch (error) {
        console.error('Error rendering server creation page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Search users API endpoint
router.get('/api/users/search', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const searchTerm = req.query.q;
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/users?filter[username]=${searchTerm}`, {
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to search users: ${response.statusText}`);
        }

        const data = await response.json();
        const users = data.data.map(user => ({
            discordId: user.attributes.external_id,
            username: user.attributes.username,
            avatar: user.attributes.avatar ? `https://cdn.discordapp.com/avatars/${user.attributes.external_id}/${user.attributes.avatar}` : 'https://i.imgur.com/GY3cXet.png'
        }));

        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get locations API endpoint
router.get('/api/locations', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/locations`, {
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch locations: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search software API endpoint
router.get('/api/software/search', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const searchTerm = req.query.q;
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/nests/1/eggs?include=variables`, {
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to search software: ${response.statusText}`);
        }

        const data = await response.json();
        const software = data.data
            .filter(egg => egg.attributes.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(egg => ({
                id: egg.attributes.id,
                name: egg.attributes.name,
                description: egg.attributes.description
            }));

        res.json(software);
    } catch (error) {
        console.error('Error searching software:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create server API endpoint
router.post('/api/servers/create', async (req, res) => {
    if (!req.session.pterodactyl || !req.session.pterodactyl.root_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const { name, user, location, software, resources } = req.body;

        // Create server on Pterodactyl
        const response = await fetch(`${settings.pterodactyl.domain}/api/application/servers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.pterodactyl.key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                user,
                egg: software,
                docker_image: 'ghcr.io/pterodactyl/yolks:java_17',
                startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
                environment: {
                    SERVER_JARFILE: 'server.jar',
                    DL_PATH: null,
                    BUILD_NUMBER: 'latest'
                },
                limits: {
                    memory: resources.ram,
                    swap: 0,
                    disk: resources.disk,
                    io: 500,
                    cpu: resources.cpu
                },
                feature_limits: {
                    databases: 0,
                    allocations: 1,
                    backups: 0
                },
                allocation: {
                    default: 1
                },
                deploy: {
                    locations: [location],
                    dedicated_ip: false,
                    port_range: []
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create server: ${response.statusText}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error creating server:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 