(function(rivets) {
    'use strict';

    let dependencies = ['utils.dom', 'utils', 'services/instrument-factory', 'services/alert-service', 'services/audio-service',
        'services/tune-service', 'services/validation-service'];
    define(dependencies, TunesController);

    function TunesController(domUtils, utils, instrumentFactory, alertService, audioService, tuneService, validationService) {
        let scope = {
            actions: {
                addPart: addPart,
                blurOnEnter: blurOnEnter,
                create: createTune,
                delete: deleteTune,
                deletePart: deletePart,
                generateTuneDownloadLink: function() {
                    scope.tuneDataUrl = utils.dataUrl(tuneService.actions.getTuneForExport());
                },
                load: loadTune,
                onBarsEditing: function() {
                    scope.editBars.number = scope.model.tune.bars.length
                },
                onPartEditing: function() {
                    scope.editPart = new EditPartViewModel(scope.model.part);
                },
                onTuneUploadFileChanged: onTuneUploadFileChanged,
                save: saveTune,
                selectPart: selectPart,
                updateBars: updateBars,
                updatePart: updatePart,
                uploadTune: uploadTune
            },
            audioActions: audioService.actions,
            audioModel: audioService.model,
            editBars: {
                number: 0
            },
            editPart: null,
            instruments: instrumentFactory.available(),
            model: tuneService.model,
            newPart: new EditPartViewModel({}),
            newTune: {
                instrumentName: '',
                name: ''
            },
            tuneDataUrl: '',
            uploadedTune: null
        };

        function EditPartViewModel(options) {
            let viewModel = this;

            this.instrumentName = options.instrumentName || '';
            this.name = options.name || '';
            this.sound = options.sound || '';
            let sounds = (this.sounds = []);

            this.reset = reset;
            this.selectInstrument = selectInstrument;

            populateSounds();

            function reset() {
                this.instrumentName = '';
                this.name = '';
                this.sound = '';
            }

            function selectInstrument() {
                populateSounds();
                viewModel.sound = sounds.length > 0 ? sounds[0] : '';
            }

            function populateSounds() {
                sounds.splice(0, sounds.length);
                sounds.push(...instrumentFactory.sounds(viewModel.instrumentName));
            }
        }

        return {
            load: function() {
                tuneService.load();
                if (tuneService.model.tunes.length === 0) {
                    domUtils.openModal('#tunes-manager');
                }
                bind();
            }
        };

        function bind() {
            let view = document.getElementById('tunes');
            rivets.bind(view, scope);
            view.classList.remove('binding');
        }

        // actions
        function addPart() {
            if (validateNewPart()) {
                tuneService.actions.addPart(scope.newPart);
                scope.newPart.reset();

                domUtils.closeModal();
                alertService.addAlert({ message: 'Part added', timeout: 2000 });
            }
        }

        function blurOnEnter(e) {
            if (e.keyCode === 13) {
                e.target.blur();
                e.preventDefault();
            }
        }

        function createTune() {
            if (validateNewTune()) {
                tuneService.actions.create(scope.newTune);

                scope.newTune.name = '';
                scope.newTune.instrumentName = '';

                domUtils.closeModal();
            }
        }

        function deletePart() {
            if (confirm('Are you sure you want to delete this part?')) {
                tuneService.actions.deletePart(scope.model.part);
                alertService.addAlert({ message: 'Part deleted', timeout: 2000 });
            }
        }

        function deleteTune(e, scope) {
            if (confirm('Are you sure you want to delete this tune?')) {
                tuneService.actions.delete(scope.tune.id);
                alertService.addAlert({ message: 'Tune deleted', timeout: 2000 });
            }
        }

        function loadTune(e, scope) {
            tuneService.actions.load(scope.tune.id);
            domUtils.closeModal();
        }

        function onTuneUploadFileChanged(e) {
            if (e.target.files.length > 0) {
                let reader = new FileReader();
                reader.onload = onTuneUploadFileRead;
                reader.readAsText(e.target.files[0]);
            } else {
                scope.uploadedTune = null;
            }
        }

        function onTuneUploadFileRead(e) {
            try {
                let tuneObject = JSON.parse(e.target.result);
                scope.uploadedTune = tuneObject;
            } catch(err) {
                scope.uploadedTune = null;
            }
        }

        function saveTune() {
            if (validateTune()) {
                tuneService.actions.updateTune(tuneService.model.tune);
                alertService.addAlert({ message: 'Tune updated', timeout: 2000 });
            }
        }

        function selectPart(e, scope) {
            tuneService.actions.selectPart(scope.index);
            // don't let the click bubble so that tab selections are preserved
            e.stopPropagation();
        }

        function updateBars(e, scope) {
            if (validationService.validateForm(document.getElementById('edit-bars'))) {
                tuneService.actions.updateBars({
                    number: scope.editBars.number
                });
                domUtils.closeModal();
                alertService.addAlert({ message: 'Bars updated', timeout: 2000 });
            }
        }

        function updatePart() {
            tuneService.actions.updatePart(scope.model.part.index(), scope.editPart);
            domUtils.closeModal();
            alertService.addAlert({ message: 'Part updated', timeout: 2000 });
        }

        function uploadTune() {
            if (!scope.uploadedTune) {
                return;
            }

            tuneService.actions.importTune(scope.uploadedTune);
        }

        function validateNewPart() {
            return validationService.validateForm(document.getElementById('add-part'));
        }

        function validateNewTune() {
            let results = [];
            results.push(validationService.validateForm(document.getElementById('create-tune')));
            results.push(validateTuneName(document.getElementById('new-tune-name')));
            return results.filter(r => r === false).length === 0;
        }

        function validateTune() {
            let results = [];
            let tuneNameElement = document.getElementById('tune-name');
            results.push(validationService.validateElement(tuneNameElement));
            results.push(validationService.validateElement(document.getElementById('tune-bpm')));
            results.push(validateTuneName(tuneNameElement, scope.model.tune.id));
            return results.filter(r => r === false).length === 0;
        }

        function validateTuneName(element, id) {
            let valid = tuneService.tuneNameExists(element.value, id) === false;
            if (!valid) {
                validationService.setElementValidity(element, false);
            }
            return valid;
        }
    }
})(rivets);