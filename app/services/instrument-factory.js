(function() {
    'use strict';

    define(['models/instrument', 'models/string'], InstrumentFactory);

    function InstrumentFactory(Instrument, String) {
        const instruments = {
            banjo: function() {
                let banjo = new Instrument({ name: 'banjo', frets: 24 });
                banjo.strings.push(new String({ index: 0, note: 'D', octave: 5 }));
                banjo.strings.push(new String({ index: 1, note: 'B', octave: 4 }));
                banjo.strings.push(new String({ index: 2, note: 'G', octave: 4 }));
                banjo.strings.push(new String({ index: 3, note: 'D', octave: 4 }));
                banjo.strings.push(new String({ index: 4, note: 'G', octave: 5, startFret: 5 }));
                return banjo;
            },
            bass: function() {
                let bass = new Instrument({ name: 'bass', frets: 24 });
                bass.strings.push(new String({ index: 0, note: 'G', octave: 3 }));
                bass.strings.push(new String({ index: 1, note: 'D', octave: 3 }));
                bass.strings.push(new String({ index: 2, note: 'A', octave: 2 }));
                bass.strings.push(new String({ index: 3, note: 'E', octave: 2 }));
                return bass;
            },
            guitar: function() {
                let guitar = new Instrument({ name: 'guitar', frets: 24 });
                guitar.strings.push(new String({ index: 0, note: 'E', octave: 5 }));
                guitar.strings.push(new String({ index: 1, note: 'B', octave: 4 }));
                guitar.strings.push(new String({ index: 2, note: 'G', octave: 4 }));
                guitar.strings.push(new String({ index: 3, note: 'D', octave: 4 }));
                guitar.strings.push(new String({ index: 4, note: 'A', octave: 3 }));
                guitar.strings.push(new String({ index: 5, note: 'E', octave: 3 }));
                return guitar;
            },
            violin: function() {
                let violin = new Instrument({ name: 'violin', frets: 24 });
                violin.strings.push(new String({ index: 0, note: 'E', octave: 6 }));
                violin.strings.push(new String({ index: 1, note: 'A', octave: 5 }));
                violin.strings.push(new String({ index: 2, note: 'D', octave: 5 }));
                violin.strings.push(new String({ index: 3, note: 'G', octave: 4 }));
                return violin;
            }
        };

        const instrumentSounds = {
            banjo: ['banjo'],
            bass: ['acoustic_bass', 'electric_bass_finger', 'electric_bass_pick', 'fretless_bass'],
            guitar: ['acoustic_guitar_nylon', 'acoustic_guitar_steel', 'distortion_guitar', 'electric_guitar_clean', 'electric_guitar_jazz'],
            violin: ['violin']
        };

        return {
            available: function() {
                return getAvailableNames();
            },
            defaultSound: function(name) {
                return instrumentSounds[name][0];
            },
            get: function(name) {
                if (instruments.hasOwnProperty(name)) {
                    return instruments[name]();
                }
                return null;
            },
            sounds: function(name) {
                if (!instrumentSounds.hasOwnProperty(name)) {
                    return [];
                }
                return instrumentSounds[name].slice();
            }
        };

        function getAvailableNames() {
            let names = [];
            for (var name in instruments) {
                if (instruments.hasOwnProperty(name)) {
                    names.push(name);
                }
            }
            return names;
        }
    }
})();