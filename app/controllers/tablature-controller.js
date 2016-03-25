(function(rivets) {
    'use strict';

    define(['utils.dom', 'utils', 'models/note', 'services/audio-service', 'services/tablature-service', 'services/tune-service'], TablatureController);

    function TablatureController(domUtils, utils, Note, audioService, tablatureService, tuneService) {
        let scope = {
            model: tablatureService.model,
            part: null,
            playPosition: null,
            selectedNoteElement: null,
            selectedNote: null
        };

        tuneService.addEventListener('part.selected', onPartSelected);
        audioService.addEventListener('play-position.changed', onPlayPositionChanged);

        return {
            load: function() {
                bindEvents();
            }
        };

        function bind() {
            let view = document.getElementById('tablature');
            rivets.bind(view, scope);
        }

        function bindEvents() {
            bindClick();
            bindKeys();
        }

        function bindClick() {
            document.addEventListener('click', function(e) {
                if (!selectString(e.target)) {
                    cancelStringSelect();
                }
            });
        }

        function bindKeys() {
            document.addEventListener('keypress', function(e) {
                if (!scope.selectedNoteElement || e.shiftKey === true) {
                    return;
                }

                // 0 - 9
                if (e.charCode >= 48 && e.charCode <= 57) {
                    // The typed number
                    let number = e.charCode - 48;
                    let active = domUtils.isActive(scope.selectedNoteElement);
                    // Append the typed number to the current content if it is active, else set the typed number
                    let fret = parseInt(`${active ? scope.selectedNote.fret : ''}${number}`);
                    if (!setFret(fret)) {
                        // Set the fret to the current number if not successful.
                        setFret(number);
                    }

                    // Set a timer on the note element to flag it as active
                    domUtils.setActive(scope.selectedNoteElement);
                }
            });

            document.addEventListener('keydown', function(e) {
                if (!scope.selectedNoteElement) {
                    return;
                }

                if (e.keyCode === 46) {
                    // delete
                    setFret(null);
                }
                else if (e.keyCode === 8) {
                    // backspace
                    let existing = scope.selectedNote.fret;
                    if (existing !== null) {
                        existing = existing.toString();
                        let fret = parseInt(existing.substring(0, existing.length - 1));
                        setFret(fret);
                    }
                    e.preventDefault();
                }
                else if (e.keyCode === 37) {
                    // left arrow
                    moveHorizontally(-1);
                }
                else if (e.keyCode === 38) {
                    // up arrow - move all the way to top if ctrl
                    moveVertically(e.ctrlKey === true ? -2 : -1);
                    e.preventDefault();
                }
                else if (e.keyCode === 40) {
                    // down arrow - move all the way to down if ctrl
                    moveVertically(e.ctrlKey === true ? 2 : 1);
                    e.preventDefault();
                }
                else if (e.keyCode === 39) {
                    // right arrow
                    moveHorizontally(1);
                } else if (e.keyCode === 9) {
                    // tab forwards and backwards through crotchets
                    moveHorizontally(e.shiftKey === true ? -2 : 2);
                    e.preventDefault();
                }
            });
        }

        function onPartSelected(part) {
            scope.part = part;
            bind();
        }

        // dom functions
        function moveVertically(direction) {
            let target = null;
            if (Math.abs(direction) === 1) {
                // move by 1 string if direction is 1 or -1
                target = domUtils.sibling(scope.selectedNoteElement, direction, 'string');
            } else if (Math.abs(direction) === 2) {
                // move to top string if direction is -2, else to bottom string
                let strings = scope.selectedNoteElement.parentElement.querySelectorAll('.string');
                target = strings[direction === -2 ? 0 : strings.length - 1];
            }

            selectString(target);
        }

        function moveHorizontally(direction) {
            // todo: enum for direction
            let sibling = null;
            if (Math.abs(direction) === 1) {
                // move by 1 quaver if direction is 1 or -1
                sibling = getSiblingQuaver(scope.selectedNoteElement, direction);
            } else if (Math.abs(direction) === 2) {
                // move by 1 crotchet if direction is 2 or -2
                if (direction < 0 && scope.selectedNote.quaver > 0) {
                    // stay within same crotchet if tabbing backwards from an advanced position within a crotchet
                    sibling = domUtils.closestClass(scope.selectedNoteElement, 'crotchet');
                } else {
                    sibling = getSiblingCrotchet(scope.selectedNoteElement, direction);
                }
            }

            if (!sibling) {
                return;
            }

            let index = domUtils.indexInParent(scope.selectedNoteElement, 'string');
            let target = sibling.querySelectorAll('.string')[index];
            selectString(target);
        }

        function onPlayPositionChanged(position) {
            if (scope.playPosition) {
                scope.playPosition.classList.remove('play-position');
            }

            scope.playPosition = getQuaver(position);

            scope.playPosition.classList.add('play-position');
        }

        function selectString(target) {
            if (!target || !domUtils.hasClass(target, 'string')) {
                return false;
            }

            cancelStringSelect();

            target.classList.add('selected');
            scope.selectedNoteElement = target;
            scope.selectedNote = getNote(target);

            if (scope.selectedNote) {
                audioService.actions.setPlayPosition(scope.selectedNote);
            }

            return true;
        }

        function getNote(target) {
            let stringElement = domUtils.closestClass(target, 'string');
            let quaverElement = domUtils.closestClass(stringElement, 'quaver');
            let crotchetElement = domUtils.closestClass(quaverElement, 'crotchet');
            let barElement = domUtils.closestClass(crotchetElement, 'bar');
            let fret = parseInt(stringElement.textContent);
            if (isNaN(fret)) {
                fret = null;
            }

            return new Note({
                bar: domUtils.indexInParent(barElement, 'bar'),
                crotchet: domUtils.indexInParent(crotchetElement, 'crotchet'),
                fret: fret,
                quaver: domUtils.indexInParent(quaverElement, 'quaver'),
                string: domUtils.indexInParent(stringElement, 'string')
            });
        }

        function cancelStringSelect() {
            if (!scope.selectedNoteElement) {
                return;
            }

            scope.selectedNoteElement.classList.remove('selected');
            scope.selectedNoteElement = null;
            scope.selectedNote = null;
        }

        function getQuaver(position) {
            return document.querySelector(
                `.bar:nth-child(${position.bar + 1}) .crotchet:nth-child(${position.crotchet + 1}) .quaver:nth-child(${position.quaver + 1})`);
        }

        function getSiblingQuaver(element, direction) {
            let quaver = domUtils.sibling(element, direction, 'quaver', 'crotchet');
            if (quaver) {
                return quaver;
            }
            return domUtils.sibling(element, direction, 'quaver', 'bar');
        }

        function getSiblingCrotchet(element, direction) {
            return domUtils.sibling(element, direction, 'crotchet', 'bar');
        }

        function setFret(fret) {
            if (fret === undefined || isNaN(fret) === true) {
                fret = null;
            }

            scope.selectedNote.fret = fret;
            return tablatureService.actions.setNote(scope.selectedNote);
        }
    }
})(rivets);