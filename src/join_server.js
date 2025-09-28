// By: https://github.com/shyybi

const mineflayer = require('mineflayer')
const { startTabMonitoring } = require('./tab.js')

async function join_arena(bot) {
    let retryCount = 0
    const maxRetries = 3
    let chestOpened = false
    let foundSword = false
    let inArena = false
    let tabMonitor = null
    
    bot.on('spawn', () => {
        if (inArena) {
            console.log("[INFO] Bot déjà dans l'arène, pas de reconnexion nécessaire")
            return
        }
        
        console.log("[INFO] Bot spawné, tentative de connexion à l'arène...")
        
        setTimeout(() => {
            if (!tabMonitor) {
                tabMonitor = startTabMonitoring(bot)
            }
            console.log("[TAB] Query du serveur pour récupérer la liste complète des joueurs...")
            tabMonitor.listAllPlayers().then(players => {
                if (players.length > 0) {
                    console.log(`[TAB] Joueurs connectés au serveur: ${players.length} (${players.join(', ')})`)
                } else {
                    console.log("[TAB] Impossible de récupérer la liste - serveur protégé ou méthodes non supportées")
                }
            })
        }, 2000)
        
        setTimeout(() => {
            try {
                console.log("[OK] Sélection du slot 0")
                bot.setQuickBarSlot(0)
                
                setTimeout(() => {
                    console.log("[OK] Clic droit sur le slot 0 - Ouverture du menu")
                    bot.activateItem()
                    
                    setTimeout(() => {
                        console.log("[!] Tentative d'interaction avec le menu...")
                        handleMenuDirectly()
                    }, 2000)
                    
                }, 500)
                
            } catch (error) {
                console.log("[ERR] Erreur lors de l'interaction avec le slot 0:", error.message)
            }
        }, 1000)
    })
    
    bot.on('windowOpen', (window) => {
        console.log("[INFO] Fenêtre ouverte:", window.title || 'Sans titre')
        
        if (!chestOpened && !inArena && (window.title === "Menu des jeux" || window.title.includes("Menu"))) {
            console.log("[!] Menu des jeux détecté via windowOpen !")
            chestOpened = true
            handleGameMenu(window)
        }
    })
    
    bot.on('respawn', () => {
        if (foundSword) {
            console.log("[INFO] Bot téléporté vers l'arène après avoir pris l'épée")
            inArena = true
            chestOpened = false
            console.log("[INFO] Mode arène activé - plus d'interaction avec le menu")
            
            if (!tabMonitor) {
                tabMonitor = startTabMonitoring(bot)
            }
            tabMonitor.start()
        }
    })
    
    bot.on('health', () => {
        if (foundSword && bot.health < 20) {
            console.log(`[COMBAT] Vie du bot: ${bot.health}/20`)
        }
    })
    
    function handleMenuDirectly() {
        if (chestOpened || inArena) return
        
        console.log("[!] Mode fallback - Interaction directe avec le menu")
        chestOpened = true
        
        setTimeout(() => {
            if (bot.currentWindow) {
                console.log("[INFO] Menu avec " + bot.currentWindow.slots.length + " slots détecté")
                printMenuItems(bot.currentWindow)
                handleGameMenu(bot.currentWindow)
            } else {
                console.log("[WARN] Aucune fenêtre ouverte détectée")
                testAllSlots()
            }
        }, 2000)
    }
    
    function handleGameMenu(window) {
        printMenuItems(window)
        
        window.on('updateSlot', (slot, oldItem, newItem) => {
            if (newItem && !foundSword) {
                const itemName = newItem.displayName || newItem.name || `Item type ${newItem.type}`
                console.log(`[UPDATE] Mise à jour coffre: ${itemToString(oldItem)} -> ${itemToString(newItem)} (slot: ${slot})`)
                
                if (itemName.toLowerCase().includes('sword') || itemName.toLowerCase().includes('épée')) {
                    console.log(`[SWORD] Épée détectée dans le slot ${slot}: ${itemName}`)
                    foundSword = true
                    clickOnSword(slot)
                    return
                }
            }
        })
        
        window.on('close', () => {
            console.log("[INFO] Coffre fermé")
            if (foundSword) {
                console.log("[INFO] Épée obtenue, bot prêt dans l'arène")
            }
            chestOpened = false
        })
        
        bot.on('chat', onGameMenuChat)
    }
    
    async function clickOnSword(slotNumber) {
        try {
            console.log(`[SWORD] Clic automatique sur l'épée (slot ${slotNumber})...`)
            await bot.clickWindow(slotNumber, 0, 0)
            console.log(`[OK] Clic réussi sur l'épée !`)
            console.log(`[INFO] Attente de téléportation vers l'arène...`)
            
            foundSword = true
            inArena = true
            
            setTimeout(() => {
                console.log(`[INFO] Bot maintenant dans l'arène, prêt pour le combat !`)
                bot.removeListener('chat', onGameMenuChat)
                if (bot.currentWindow) {
                    try {
                        bot.currentWindow.close()
                    } catch (e) {}
                }
            }, 2000)
            
        } catch (error) {
            console.log(`[ERR] Erreur lors du clic sur l'épée: ${error.message}`)
        }
    }
    
    async function testAllSlots() {
        if (!bot.currentWindow) {
            console.log("[ERR] Pas de fenêtre ouverte pour tester les slots")
            return
        }
        
        const totalSlots = bot.currentWindow.slots.length
        console.log(`[!] Début des clics sur TOUS les ${totalSlots} slots du menu...`)
        
        for (let i = 0; i < totalSlots; i++) {
            if (foundSword) {
                console.log("[SWORD] Épée trouvée, arrêt du test des slots")
                break
            }
            
            try {
                const slot = bot.currentWindow.slots[i]
                if (slot && slot.type !== null && slot.type !== -1) {
                    const itemName = slot.displayName || slot.name || `Item type ${slot.type}`
                    console.log(`[SLOT] Slot ${i}: ${itemName}`)
                    console.log(`   [INFO] Type: ${slot.type}`)
                    console.log(`   [INFO] Quantité: ${slot.count}`)
                    
                    if (itemName.toLowerCase().includes('sword') || itemName.toLowerCase().includes('épée')) {
                        console.log(`[SWORD] Épée trouvée dans le slot ${i}: ${itemName}`)
                        foundSword = true
                        await clickOnSword(i)
                        break
                    }
                } else {
                    console.log(`[SLOT] Slot ${i}: (vide)`)
                }
                
                await bot.clickWindow(i, 0, 0)
                console.log(`[OK] Clic réussi sur le slot ${i}`)
                
                await new Promise(resolve => setTimeout(resolve, 800))
                
            } catch (error) {
                console.log(`[ERR] Erreur slot ${i}: ${error.message}`)
            }
        }
        
        console.log("[OK] Tous les slots du menu testés")
    }
    
    function onGameMenuChat(username, message) {
        if (username === bot.username) return
        
        // Filtrer les messages répétitifs du serveur
        if (message.includes('Equipes autorisées') || 
            message.includes('Teams allowed') ||
            message.includes('Commande inconnue')) {
            return
        }
        
        switch (message.toLowerCase()) {
            case 'list':
                if (bot.currentWindow) {
                    printMenuItems(bot.currentWindow)
                } else {
                    console.log("[ERR] Aucun coffre ouvert")
                }
                break
                
            case 'close':
                closeGameMenu()
                break
                
            default:
                if (message.startsWith('click ')) {
                    const slotNumber = parseInt(message.split(' ')[1])
                    if (!isNaN(slotNumber)) {
                        clickSlot(slotNumber)
                    }
                } else if (message.startsWith('take ')) {
                    const itemName = message.substring(5)
                    takeItem(itemName)
                }
                break
        }
    }
    
    function closeGameMenu() {
        try {
            if (bot.currentWindow) {
                bot.closeWindow(bot.currentWindow)
                console.log("[INFO] Coffre fermé manuellement")
            }
        } catch (error) {
            console.log("[ERR] Erreur lors de la fermeture:", error.message)
        }
    }
    
    async function clickSlot(slotNumber) {
        try {
            await bot.clickWindow(slotNumber, 0, 0)
            console.log(`[OK] Clic réussi sur le slot ${slotNumber}`)
        } catch (error) {
            console.log(`[ERR] Erreur lors du clic sur le slot ${slotNumber}: ${error.message}`)
        }
    }
    
    async function takeItem(itemName) {
        if (!bot.currentWindow) {
            console.log("[ERR] Aucun coffre ouvert")
            return
        }
        
        const targetItem = itemByName(bot.currentWindow.slots, itemName)
        if (targetItem) {
            const slotIndex = bot.currentWindow.slots.indexOf(targetItem.item)
            try {
                await bot.clickWindow(slotIndex, 0, 0)
                console.log(`[OK] Pris: ${itemToString(targetItem.item)}`)
            } catch (error) {
                console.log(`[ERR] Erreur lors de la prise de l'item: ${error.message}`)
            }
        } else {
            console.log(`[ERR] Item "${itemName}" non trouvé`)
        }
    }
    
    function printMenuItems(window) {
        console.log("\n[MENU] === CONTENU DU MENU DES JEUX ===")
        try {
            console.log(`[INFO] Titre: ${window.title || 'Menu des jeux'}`)
            console.log(`[INFO] Taille: ${window.slots.length} slots`)
            
            let itemCount = 0
            window.slots.forEach((slot, index) => {
                try {
                    if (slot && slot.type !== null && slot.type !== -1) {
                        itemCount++
                        const item = slot
                        console.log(`[ITEM] Slot ${index}: ${item.displayName || item.name || `Item type ${item.type}`}`)
                        console.log(`   [INFO] Type: ${item.type}`)
                        console.log(`   [INFO] Quantité: ${item.count}`)
                        
                        if (item.nbt && Object.keys(item.nbt).length < 50) {
                            console.log(`   [NBT] ${JSON.stringify(item.nbt, null, 2)}`)
                        }
                        console.log("   ---")
                    }
                } catch (slotError) {
                    console.log(`   [ERR] Erreur slot ${index}: ${slotError.message}`)
                }
            })
            
            console.log(`[INFO] Total: ${itemCount} items trouvés`)
            
        } catch (error) {
            console.log(`[ERR] Erreur lors de l'affichage: ${error.message}`)
        }
        
        console.log("[MENU] === FIN DU CONTENU ===\n")
    }
    
    function itemToString(item) {
        if (!item || item.type === null || item.type === -1) return 'Empty'
        const name = item.displayName || item.name || `Item ${item.type}`
        return `${name} x ${item.count}`
    }
    
    function itemByName(items, name) {
        name = name.toLowerCase()
        for (const item of items) {
            if (!item || item.type === null) continue
            const itemName = (item.displayName || item.name || '').toLowerCase()
            if (itemName.includes(name)) {
                return { item, name: itemName }
            }
        }
        return null
    }
}

module.exports = { join_arena };