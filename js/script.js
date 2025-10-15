// --- Wrap entire script in an IIFE to avoid polluting the global scope ---
(() => {
    'use strict';

    // --- 1. DOM ELEMENT CACHING ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-toggle-sun');
    const moonIcon = document.getElementById('theme-toggle-moon');
    
    const jsonUpload = document.getElementById('json-upload');
    const saveProgressBtn = document.getElementById('save-progress-btn');
    const generateBtn = document.getElementById('generate-btn');
    const loadProgressBtn = document.getElementById('new-load-song-btn');

    const errorContainer = document.getElementById('error-message-container');
    const outputContainer = document.getElementById('output-container');
    
    const copyBtn = document.getElementById('copy-btn');
    const downloadTxtBtn = document.getElementById('download-txt-btn');
    const downloadJsonBtn = document.getElementById('download-json-btn');
    const startOverBtn = document.getElementById('start-over-btn');

    const songTitleInput = document.getElementById('song-title');
    const outputTitle = document.getElementById('output-title');
    const songOutput = document.getElementById('song-output');
    const musicianNotesOutput = document.getElementById('musician-notes-output');

    const ideaInputs = {
        'main-idea': document.getElementById('main-idea'),
        'opening-scene': document.getElementById('opening-scene'),
        'story-development': document.getElementById('story-development'),
        'turning-point': document.getElementById('turning-point')
    };

    const contextOutputs = {
        'main-idea': document.getElementById('context-chorus'),
        'opening-scene': document.getElementById('context-verse1'),
        'story-development': document.getElementById('context-verse2'),
        'turning-point': document.getElementById('context-bridge')
    };

    // --- 2. CORE FUNCTIONS ---

    const showToast = (message) => {
        const toast = document.getElementById('toast-notification');
        if (!toast) return; // Prevent errors if the element is missing
        toast.textContent = message;
        toast.classList.remove('opacity-0', 'translate-x-full');
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-full');
        }, 3000); // Hide after 3 seconds
    };
    
    const handleStartOver = () => {
        document.querySelectorAll('textarea, input[type="text"]').forEach(input => input.value = '');
        Object.values(contextOutputs).forEach(el => el.textContent = '...');
        document.querySelectorAll('.sound-choice-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.hasAttribute('aria-pressed')) {
                btn.setAttribute('aria-pressed', 'false');
            }
        });
        outputContainer.classList.add('hidden');
        if (errorContainer) errorContainer.innerHTML = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        }
    };
    
    const getLyricsAsArray = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('textarea')).map(ta => ta.value);
    };

    const getLyricsAsString = (containerId, usePlaceholder = false) => {
        const lines = getLyricsAsArray(containerId).filter(line => line.trim().length > 0);
        if (usePlaceholder && lines.length === 0) {
            const sectionName = containerId.replace('-lyrics', '').replace(/(\d)/, ' $1');
            return `[${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} lyrics not provided]`;
        }
        return lines.join('\n');
    };

    const getSongDataAsObject = () => {
        const getSelectedValues = (group) => Array.from(document.querySelectorAll(`.sound-choice-btn[data-group="${group}"].selected`)).map(btn => btn.dataset.value);
        const getSingleSelectedValue = (group) => document.querySelector(`.sound-choice-btn[data-group="${group}"].selected`)?.dataset.value || null;

        return {
            songTitle: songTitleInput.value,
            ideas: {
                mainIdea: ideaInputs['main-idea'].value,
                openingScene: ideaInputs['opening-scene'].value,
                storyDevelopment: ideaInputs['story-development'].value,
                turningPoint: ideaInputs['turning-point'].value,
            },
            lyrics: {
                intro: document.getElementById('intro-lyrics').value,
                chorus: getLyricsAsArray('chorus-lyrics'),
                verse1: getLyricsAsArray('verse1-lyrics'),
                verse2: getLyricsAsArray('verse2-lyrics'),
                bridge: getLyricsAsArray('bridge-lyrics'),
                outro: document.getElementById('outro-lyrics').value,
            },
            sound: {
                tempo: getSingleSelectedValue('tempo'),
                key: getSingleSelectedValue('key'),
                instruments: getSelectedValues('instrument'),
                vocalist: getSingleSelectedValue('vocalist'),
                vocalStyle: getSelectedValues('vocal-style'),
                otherConsiderations: document.getElementById('other-considerations').value,
            }
        };
    };

    const populateFormWithData = (data) => {
        handleStartOver(); 
        songTitleInput.value = data.songTitle || '';
        
        if (data.ideas) {
            const ideaKeyMap = {
                'main-idea': 'mainIdea',
                'opening-scene': 'openingScene',
                'story-development': 'storyDevelopment',
                'turning-point': 'turningPoint'
            };
            Object.keys(ideaInputs).forEach(key => {
                const ideaDataKey = ideaKeyMap[key];
                if (data.ideas[ideaDataKey] && ideaInputs[key]) {
                    ideaInputs[key].value = data.ideas[ideaDataKey];
                    ideaInputs[key].dispatchEvent(new Event('input'));
                }
            });
        }
        
        if (data.lyrics) {
            document.getElementById('intro-lyrics').value = data.lyrics.intro || '';
            document.getElementById('outro-lyrics').value = data.lyrics.outro || '';
            const populateLines = (containerId, lines) => {
                if (!lines) return;
                const textareas = document.getElementById(containerId)?.querySelectorAll('textarea');
                textareas?.forEach((ta, index) => {
                    ta.value = lines[index] || '';
                });
            };
            populateLines('chorus-lyrics', data.lyrics.chorus);
            populateLines('verse1-lyrics', data.lyrics.verse1);
            populateLines('verse2-lyrics', data.lyrics.verse2);
            populateLines('bridge-lyrics', data.lyrics.bridge);
        }

        if (data.sound) {
            // THIS MAP FIXES THE BUG by linking the button's data-group to the JSON property name.
            const soundKeyMap = {
                'tempo': 'tempo',
                'key': 'key',
                'instrument': 'instruments', // The button group is 'instrument', but the data is 'instruments'
                'vocalist': 'vocalist',
                'vocal-style': 'vocalStyle'  // The button group is 'vocal-style', but the data is 'vocalStyle'
            };

            document.querySelectorAll('.sound-choice-btn').forEach(btn => {
                const group = btn.dataset.group;
                const value = btn.dataset.value;
                const dataKey = soundKeyMap[group]; // Use the map to find the correct key
                if (!dataKey) return; // Skip if the group isn't in our map

                const savedData = data.sound[dataKey];
                const isSelected = Array.isArray(savedData) ? savedData.includes(value) : savedData === value;
                
                btn.classList.toggle('selected', isSelected);
                if (btn.hasAttribute('aria-pressed')) {
                    btn.setAttribute('aria-pressed', isSelected);
                }
            });
            document.getElementById('other-considerations').value = data.sound.otherConsiderations || '';
        }
        showToast('Song data loaded successfully!');
    };

    // --- 3. EVENT HANDLERS & LOGIC ---

    const assembleSong = (usePlaceholders = false) => {
        if (errorContainer) errorContainer.innerHTML = '';
        const data = getSongDataAsObject();

        outputTitle.textContent = data.songTitle.trim() || 'Untitled Song';

        const songParts = [
            { label: 'Intro', content: data.lyrics.intro },
            { label: 'Verse 1', content: getLyricsAsString('verse1-lyrics', usePlaceholders) },
            { label: 'Chorus', content: getLyricsAsString('chorus-lyrics', usePlaceholders) },
            { label: 'Verse 2', content: getLyricsAsString('verse2-lyrics', usePlaceholders) },
            { label: 'Chorus', content: getLyricsAsString('chorus-lyrics', usePlaceholders) },
            { label: 'Bridge', content: getLyricsAsString('bridge-lyrics', usePlaceholders) },
            { label: 'Chorus', content: getLyricsAsString('chorus-lyrics', usePlaceholders) },
            { label: 'Outro', content: data.lyrics.outro },
        ];

        songOutput.textContent = songParts
            .filter(part => part.content?.trim())
            .map(part => `[${part.label}]\n${part.content}`)
            .join('\n\n');

        const notesParts = [
            `Overall Vibe: A song that feels ${data.sound.key?.toLowerCase().includes('major') ? 'hopeful and open' : 'thoughtful and dramatic'}.`,
            `Tempo: ${data.sound.tempo || 'Not specified'}`,
            `Key: ${data.sound.key || 'Not specified'}`,
            `Instrumentation: ${data.sound.instruments.join(', ') || 'Not specified'}`,
            `Vocalist: ${data.sound.vocalist || 'Not specified'}`,
            `Vocal Style: ${data.sound.vocalStyle.join(', ') || 'Not specified'}`,
        ];
        
        let musicianNotes = notesParts.join('\n').trim();
        if (data.sound.otherConsiderations) {
            musicianNotes += `\n\nOther Considerations:\n${data.sound.otherConsiderations}`;
        }
        
        musicianNotesOutput.value = musicianNotes;
        outputContainer.classList.remove('hidden');
        outputContainer.scrollIntoView({ behavior: 'smooth' });
    };
    
    const handleGenerateClick = () => {
        if (!errorContainer) return;
        errorContainer.innerHTML = '';
        const missingSections = [];
        if (getLyricsAsString('chorus-lyrics').trim().length === 0) missingSections.push('Chorus');
        if (getLyricsAsString('verse1-lyrics').trim().length === 0) missingSections.push('Verse 1');
        
        if (missingSections.length > 0) {
            errorContainer.innerHTML = `<div class="error-message">
                <p class="mb-4">It looks like you missed the following required sections: <strong class="font-bold">${missingSections.join(', ')}</strong>.</p>
                <p>Do you want to assemble what you have, or keep working?</p>
                <div class="mt-4 flex justify-center gap-4">
                    <button id="assemble-anyway-btn" class="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700">Assemble What I Have</button>
                    <button id="keep-editing-btn" class="bg-transparent text-teal-800 dark:text-teal-300 font-bold py-2 px-4 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900">Keep Editing</button>
                </div>
            </div>`;
            return;
        }
        assembleSong(false);
    };

    const handleSave = () => {
        const songData = getSongDataAsObject();
        const jsonString = JSON.stringify(songData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = (songData.songTitle.trim() || 'Untitled_Song').replace(/\s+/g, '_');
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getBriefContent = () => {
        const title = songTitleInput.value.trim() || 'Untitled Song';
        const lyrics = songOutput.textContent;
        const notes = musicianNotesOutput.value;
        return `SONG TITLE: ${title}\n\n--- SONG LYRICS ---\n${lyrics}\n\n--- MUSICIAN & PRODUCER NOTES ---\n${notes}`;
    };

    // --- 4. EVENT LISTENERS ---

    document.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.classList.contains('sound-choice-btn')) {
            const group = target.dataset.group;
            const isMultiSelect = group === 'instrument' || group === 'vocal-style';
            
            if (isMultiSelect) {
                target.classList.toggle('selected');
                if(target.hasAttribute('aria-pressed')) {
                    target.setAttribute('aria-pressed', target.classList.contains('selected'));
                }
            } else {
                const isCurrentlySelected = target.classList.contains('selected');
                document.querySelectorAll(`.sound-choice-btn[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
                if (!isCurrentlySelected) {
                    target.classList.add('selected');
                }
            }
        }
        if (target.id === 'assemble-anyway-btn') assembleSong(true);
        if (target.id === 'keep-editing-btn' && errorContainer) errorContainer.innerHTML = '';
    });

    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    generateBtn.addEventListener('click', handleGenerateClick);
    startOverBtn.addEventListener('click', handleStartOver);
    loadProgressBtn.addEventListener('click', () => jsonUpload.click());
    saveProgressBtn.addEventListener('click', handleSave);
    downloadJsonBtn.addEventListener('click', handleSave); 
    
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(getBriefContent()).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Brief'; }, 2000);
        });
    });

    downloadTxtBtn.addEventListener('click', () => {
        const blob = new Blob([getBriefContent()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = (songTitleInput.value.trim() || 'Untitled_Song').replace(/\s+/g, '_');
        a.download = `${filename}_brief.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    jsonUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                populateFormWithData(data);
            } catch (error) {
                showToast('Error: Could not parse JSON file.');
                console.error("JSON Parse Error:", error);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    // --- 5. INITIALIZATION ---
    
    Object.keys(ideaInputs).forEach(key => {
        ideaInputs[key].addEventListener('input', () => {
            if (contextOutputs[key]) {
                contextOutputs[key].textContent = ideaInputs[key].value || '...';
            }
        });
    });

    applyTheme(localStorage.getItem('theme') || 'light');

})();
