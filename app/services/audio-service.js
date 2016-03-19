(function(MIDI) {
    'use strict';

    define(['utils', 'services/event-service', 'services/scale-service', 'services/tablature-service', 'services/tune-service'], AudioService);

    function AudioService(utils, eventService, scaleService, tablatureService, tuneService) {
        let context = {
            bar: 0,
            crotchet: 0,
            handle: null,
            playing: false,
            quaver: 0
        };

        let model = {
            get bar() {
                return context.bar;
            },
            bounds: {
                bpm: {
                    get min() { return 40; },
                    get max() { return 300; }
                }
            },
            get bpm() {
                return model.tune ? model.tune.bpm : null;
            },
            set bpm(value) {
                if (!model.tune) {
                    return;
                }
                if (value < model.bounds.bpm.min || value > model.bounds.bpm.max) {
                    return;
                }
                model.tune.bpm = value;
                tuneService.actions.save();
            },
            notes: {},
            get tune() {
                return tuneService.model.tune;
            }
        };

        tuneService.addEventListener('load', loadInstruments);

        return {
            actions: {
                resume: resume,
                start: start,
                stop: stop
            },
            addEventListener: function(event, callback) {
                eventService.addEventListener(AudioService, event, callback);
            },
            model: model
        };

        function incrementQuaver() {
            context.quaver++;
            if (context.quaver > 3) {
                context.crotchet++;
                context.quaver = 0;
            }
            if (context.crotchet >= model.tune.beatsPerBar) {
                context.bar++;
                context.crotchet = 0;
            }
            if (context.bar >= tablatureService.model.bars.length) {
                context.bar = 0;
            }

            trigger('increment');
        }

        function loadInstruments() {
            let tune = tuneService.model.tune;
            if (!tune) {
                return;
            }

            tune.parts.forEach((part, partIndex) => {
                let sound = part.sound;
                utils.loadScript(`./assets/midi/${sound}-ogg.js`, function() {
                    MIDI.loadPlugin({
                        instrument: sound,
                        onprogress: function(state, progress) {
                            console.log(state, progress);
                        },
                        onsuccess: function() {
                            MIDI.programChange(partIndex, MIDI.GM.byName[sound].number);
                            trigger('ready');
                        }
                    });
                });
            });
        }

        function play() {
            if (!context.playing) {
                return;
            }

            playNotes();
            incrementQuaver();

            context.handle = setTimeout(play, quaverInterval());
        }

        function playNote(note, channel) {
            let midiNote = scaleService.midiNote(note.note, note.octave);
            MIDI.noteOn(channel, midiNote, 127); // channel, note, velocity
        }

        function playNotes() {
            model.tune.parts.forEach((part, partIndex) => {
                let frets = part.getFrets(context);
                if (!frets) {
                    return;
                }

                let instrument = tuneService.model.instrument;
                for (let i in frets) {
                    let string = instrument.strings[i];
                    let note = scaleService.noteAtFret(string.note, string.octave, frets[i]);
                    if (model.notes.hasOwnProperty(partIndex) && model.notes[partIndex].hasOwnProperty(i)) {
                        // stop note on current string
                        stopNote(note, partIndex);
                    }
                    model.notes[partIndex] = { i: note };
                    playNote(note, partIndex);
                }
            });

            trigger('play');
        }

        function quaverInterval() {
            let secondsPerBeat = 60 / model.bpm;
            let secondsPerQuaver = secondsPerBeat / 4;
            return 1000 * secondsPerQuaver;
        }

        function reset() {
            context.bar = 0;
            context.crotchet = 0;
            context.quaver = 0;
            trigger('reset');
        }

        function resume() {
            if (context.playing) {
                return;
            }
            context.playing = true;
            play();
        }

        function start() {
            if (context.playing) {
                return;
            }
            reset();
            context.playing = true;
            play();
        }

        function stop() {
            if (!context.playing) {
                return;
            }
            clearTimeout(context.handle);
            context.playing = false;
        }

        function stopNote(note, channel) {
            let midiNote = scaleService.midiNote(note.note, note.octave);
            MIDI.noteOff(channel, midiNote, 0);
        }

        function trigger(event, ...args) {
            eventService.trigger(AudioService, event, ...args);
        }
    }
})(MIDI);