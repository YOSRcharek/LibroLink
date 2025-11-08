export function initAINarrator(allPagesText, pageFlip) {
    const btnRead = document.getElementById('readPageBtn');
    const audioPlayer = document.getElementById('narratorPlayer');
    if (!btnRead || !audioPlayer) return;

    // Icône dans le bouton
    const icon = btnRead.querySelector('i');

    // Listener au clic
    btnRead.addEventListener('click', async (e) => {
        e.stopPropagation(); // empêche propagation, comme ton exemple summarizeBtn
        const currentPage = pageFlip.getCurrentPageIndex();
        const text = allPagesText[currentPage];
        if (!text) return alert('Page vide');

        try {
            // Si audio déjà en train de jouer, on pause
            if (!audioPlayer.paused) {
                audioPlayer.pause();
                icon.className = 'fa-solid fa-play-circle'; // remettre icône play
                return;
            }

            // Sinon, fetch le TTS et joue
            const res = await fetch('http://127.0.0.1:5000⁠/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!res.ok) throw new Error('Server error');

            const blob = await res.blob();
            audioPlayer.src = URL.createObjectURL(blob);
            audioPlayer.style.display = 'block';
            await audioPlayer.play();

            // Icône pause pendant lecture
            icon.className = 'fa-solid fa-pause-circle';

            // Quand l'audio se termine
            audioPlayer.onended = () => {
                icon.className = 'fa-solid fa-play-circle';
            };

        } catch (err) {
            console.error('AI Narrator error:', err);
            alert('❌ Impossible de lire cette page.');
        }
    });
}



    // ======== Voice Commands ========
export function initVoiceAssistant(pageFlip, allPagesText, currentLang) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("⚠️ La reconnaissance vocale n'est pas supportée par votre navigateur.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLang || 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = false;

    const voiceBtn = document.getElementById('btnVoiceDetect');
    const voiceIcon = voiceBtn?.querySelector('i');
    let listening = false;
    let currentUtterance = null;

    const commands = {
        read: ['lire', 'lecture', 'commencer lecture', 'lancer lecture', 'lis la page'],
        pause: ['pause', 'pause lecture', 'mets en pause', 'arrête un peu'],
        stop: ['stop', 'arrête', 'stop lecture', 'arrête lecture'],
        next: ['page suivante', 'suivante', 'page d’après', 'suivant'],
        prev: ['page précédente', 'précédente', 'page d’avant', 'avant'],
        note: ['ajouter une note', 'mettre une note', 'note cette page', 'note', 'écrire une note'],
        fullscreen: ['plein écran', 'agrandir écran', 'maximiser', 'mettre en plein écran'],
        zoomin: ['zoomer', 'agrandir', 'zoom avant', 'agrandir écran'],
        zoomout: ['dézoomer', 'réduire', 'zoom arrière', 'rétrécir', 'réduire écran'],
        themeDark: ['mode sombre', 'thème sombre', 'activer mode sombre'],
        themeLight: ['mode clair', 'quitter le mode sombre', 'repasser en mode clair'],
        sound: ['activer son', 'désactiver son', 'couper le son', 'remettre le son', 'son']
    };

    // === ACTIONS ===
    function readCurrentPage() {
        const currentIndex = pageFlip.getCurrentPageIndex();
        const text = (allPagesText[currentIndex] || '').replace(/[^\p{L}\p{N}\s.,;:!?'-]/gu, '');
        if (!text) return alert('⚠️ Aucune lecture disponible pour cette page.');
        speechSynthesis.cancel();
        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = currentLang;
        currentUtterance.rate = 1.1;
        speechSynthesis.speak(currentUtterance);
    }
    const pauseSpeech = () => { if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause(); };
    const stopSpeech = () => { if (speechSynthesis.speaking || speechSynthesis.paused) speechSynthesis.cancel(); };
    const flipNext = () => pageFlip.flipNext();
    const flipPrev = () => pageFlip.flipPrev();
    const zoomIn = () => document.getElementById('btnZoomIn')?.click();
    const zoomOut = () => document.getElementById('btnZoomOut')?.click();
    const toggleFullscreen = () => document.getElementById('btnFullscreen')?.click();
    const toggleSound = () => document.getElementById('btnSound')?.click();

    function activateDarkTheme() {
        const btn = document.getElementById('btnTheme');
        if (btn && !document.body.classList.contains('dark')) btn.click();
    }
    function activateLightTheme() {
             const btn = document.getElementById('btnTheme');
        if (btn && document.body.classList.contains('dark')) btn.click();
    }

    // === 📝 NOTE VOCALE ===
function handleVoiceNote(transcript) {
    // 1️⃣ Déterminer la page cible
    let pageIndex = pageFlip.getCurrentPageIndex();
    const pageMatch = transcript.match(/page\s*(\d+)/i);
    if (pageMatch) pageIndex = parseInt(pageMatch[1], 10) - 1;

    // 2️⃣ Extraire le texte de la note uniquement
    let noteMatch = transcript.match(/(?:mettre|ajouter)\s+une\s+note(?:\s+(?:de\s+la\s+page|page)\s+\d+)?\s*(.*)/i);
    if (!noteMatch || !noteMatch[1].trim()) {
        return alert("⚠️ Aucun texte de note détecté. Dictez : 'mettre une note ...'");
    }

    let noteText = noteMatch[1].trim();

    // Nettoyage : supprimer "page X" si le début du texte contient encore ça
    noteText = noteText.replace(/^page\s*\d+\s*/i, '');

    // Supprimer espaces multiples et capitaliser
    noteText = noteText.replace(/\s+/g, ' ');
    noteText = noteText.charAt(0).toUpperCase() + noteText.slice(1);

    // 3️⃣ Vérifier que la page existe
    if (!allPagesText[pageIndex]) {
        return alert(`⚠️ Page ${pageIndex + 1} inexistante.`);
    }

    // 4️⃣ Ajouter localement sans préfixe automatique
    if (typeof addNote === 'function') addNote(pageIndex, noteText);

    // 5️⃣ Préparer les données pour le serveur
    const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const livreId = window.BookConfig?.livreId || 1;

    // 6️⃣ Envoyer au backend
    fetch('/save-note', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': metaCsrf
        },
        body: JSON.stringify({
            livre_id: livreId,
            page_number: pageIndex + 1,
            text: noteText,
            date: (new Date()).toISOString().slice(0, 10)
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log(`📝 Note sauvegardée pour la page ${pageIndex + 1}:`, noteText);
            alert(`✅ Note sauvegardée avec succès pour la page ${pageIndex + 1}`);
        } else {
            console.warn('⚠️ Erreur sauvegarde note:', data);
            alert('⚠️ Erreur lors de la sauvegarde de la note.');
        }
    })
    .catch(err => {
        console.error('⚠️ Erreur fetch note:', err);
        alert('⚠️ Impossible de sauvegarder la note (connexion perdue).');
    });
}
    // === UTILITAIRE ===
    function matchCommand(transcript, keywords) {
        return keywords.some(keyword => {
            const normKeyword = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return transcript.includes(normKeyword);
        });
    }

    // === 🎧 RECONNAISSANCE VOCALE ===
    recognition.onresult = (event) => {
        // 🧠 On ne garde que le dernier segment (pas tout l’historique)
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();

        const clean = transcript.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/g, "")
            .trim();

        console.log('[🎤 Input]', transcript);
        console.log('🧹 Cleaned:', clean);

        // 🔁 On traite toutes les commandes dans la phrase
        if (matchCommand(clean, commands.stop)) { console.log("🎯 stop"); stopSpeech(); }
        if (matchCommand(clean, commands.pause)) { console.log("🎯 pause"); pauseSpeech(); }
        if (matchCommand(clean, commands.read)) { console.log("🎯 lecture"); readCurrentPage(); }
        if (matchCommand(clean, commands.next)) { console.log("🎯 suivante"); flipNext(); }
        if (matchCommand(clean, commands.prev)) { console.log("🎯 précédente"); flipPrev(); }
        if (matchCommand(clean, commands.zoomin)) { console.log("🎯 zoom avant"); zoomIn(); }
        if (matchCommand(clean, commands.zoomout)) { console.log("🎯 zoom arrière"); zoomOut(); }
        if (matchCommand(clean, commands.fullscreen)) { console.log("🎯 plein écran"); toggleFullscreen(); }
        if (matchCommand(clean, commands.themeDark)) { console.log("🎯 mode sombre"); activateDarkTheme(); }
        if (matchCommand(clean, commands.themeLight)) { console.log("🎯 mode clair"); activateLightTheme(); }
        if (matchCommand(clean, commands.sound)) { console.log("🎯 son"); toggleSound(); }
        if (matchCommand(clean, commands.note)) { console.log("🎯 note"); handleVoiceNote(transcript); }
    };

    recognition.onerror = (e) => {
        if (e.error !== 'no-speech') console.error('Voice error:', e);
    };

    recognition.onend = () => {
        // 🔇 Ne redémarre plus automatiquement
        if (listening) {
            try {
                recognition.start(); // relance auto si le micro est encore activé
            } catch (err) {
                console.warn("⚠️ Redémarrage de la reconnaissance échoué:", err);
            }
        } else {
            console.log("🎙️ Reconnaissance arrêtée (contrôlée par le bouton)");
        }
    };

    // === 🎙️ BOUTON MICRO ===
    voiceBtn?.addEventListener('click', () => {
        listening = !listening;
        if (listening) {
            try {
                recognition.start();
                voiceIcon.className = 'fa-solid fa-microphone';
                console.log("🎧 Assistant vocal activé");
            } catch (err) {
                console.warn("⚠️ Erreur démarrage micro:", err);
            }
        } else {
            recognition.stop();
            stopSpeech(); // 🛑 Arrête aussi la lecture vocale
            voiceIcon.className = 'fa-solid fa-microphone-slash';
            console.log("🛑 Assistant vocal désactivé (écoute + synthèse arrêtées)");
        }
    });
}

// aiSummary.js


function cleanText(text) {
    if (!text) return '';
    return text
        .normalize('NFKD') // normalise les accents et caractères spéciaux
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // supprime les caractères de contrôle
        .replace(/[©®™]/g, '') // supprime les symboles connus
        .replace(/[^\p{L}\p{N}\s.,;:!?'-]/gu, '') // ne garde que lettres, chiffres et ponctuation de base
        .replace(/\s{2,}/g, ' ') // supprime les espaces multiples
        .trim();
}


export async function summarizeCurrentPage(pageFlip, allPagesText, container) {
    const currentIndex = pageFlip.getCurrentPageIndex();

    const page1 = cleanText(allPagesText[currentIndex] || '');
    const page2 = cleanText(allPagesText[currentIndex + 1] || '');
    const text = (page1 + ' ' + page2).trim();

    if (!text) {
        container.innerHTML = `<p>No text found for this page.</p>`;
        return;
    }

    try {
        // ❌ Avant : await fetch(...)
        // ✅ Correction : stocker la réponse dans une variable
        const response = await fetch('http://127.0.0.1:5000/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error(`Flask error: ${response.status}`);
        const data = await response.json();

        container.innerHTML = `
            <div class="message ai">
                <h4>Summary of Pages ${currentIndex + 1}${page2 ? ' & ' + (currentIndex + 2) : ''}</h4>
                <p>${data.summary}</p>
            </div>`;
    } catch (err) {
        container.innerHTML = `<p style="color:red;">❌ Error: ${err.message}</p>`;
    }
}
export async function summarizeWholeBook(allPagesText, container) {
    if (!allPagesText || allPagesText.length === 0) {
        container.innerHTML = `<p>No text found for the full summary.</p>`;
        return;
    }

    try {
        // 1️⃣ Message initial
        container.innerHTML = `<div class="message ai"><p>⏳ Generating summary for the full book...</p></div>`;

        const blockSize = 5;  // nombre de pages regroupées par bloc
        let partialSummaries = [];

        for (let i = 0; i < allPagesText.length; i += blockSize) {
            const blockText = cleanText(allPagesText.slice(i, i + blockSize).join(' '));

            // 2️⃣ Appel au backend Flask
            const response = await fetch('http://127.0.0.1:5000/summarize', { // URL complète vers Flask
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({text: blockText})
            });

            // 3️⃣ Vérification de la réponse
            if (!response.ok) {
                throw new Error(`Flask server error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.summary) {
                throw new Error("No summary returned from server");
            }

            partialSummaries.push(data.summary);

            // 4️⃣ Affichage progressif
            container.innerHTML = `
                <div class="message ai">
                    <h4>📄 Partial Summary (${partialSummaries.length}/${Math.ceil(allPagesText.length / blockSize)})</h4>
                    <p>${partialSummaries.join(' ')}</p>
                </div>
            `;
        }

        // 5️⃣ Résumé complet
        const fullSummary = partialSummaries.join(' ');

        container.innerHTML = `
            <div class="message ai">
                <h4>📚 Full Book Summary</h4>
                <p>${fullSummary}</p>
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<p style="color:red;">❌ Error: ${err.message}</p>`;
        console.error(err);
    }
}

