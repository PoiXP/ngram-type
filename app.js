var ngramTypeConfig = {
    el: '#app',
    data: function() {
        return {
            bigrams: bigrams,
            trigrams: trigrams,
            tetragrams: tetragrams,
            pentagrams: pentagrams,
            words_50: words_50,
            words_200: words_200,
            words_200_fil: words_200_fil,
            pangrams: pangrams,
            custom_words: null,

            data: {
                source: 'bigrams',
                soundCorrectLetterEnabled: true,
                soundIncorrectLetterEnabled: true,
                soundPassedThresholdEnabled: true,
                soundFailedThresholdEnabled: true,
                bigrams: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                trigrams: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                tetragrams: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                pentagrams: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                words_50: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                words_200: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                words_200_fil: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                pangrams: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
                custom_words: {
                    combination: 2,
                    repetition: 3,
                    minimumWPM: 40,
                    minimumAccuracy: 100,
                    WPMs: [],
                    phrases: {},
                    phrasesCurrentIndex: 0,
                },
            },

            phrases: [],
            expectedPhrase: '',
            typedPhrase: '',
            startTime: '',
            hitsCorrect: 0,
            hitsWrong: 0,
            isInputCorrect: true,
            rawWPM: 0,
            accuracy: 0,
        }
    },
    computed: {
        dataSource: function() {
            var defaultConfig = {
                combination: 2,
                repetition: 3,
                minimumWPM: 40,
                minimumAccuracy: 100,
                WPMs: [],
                phrases: {},
                phrasesCurrentIndex: 0,
            };
            var dataSource = this.data['source'];
            if (!this.data[dataSource]) {
                this.data[dataSource] = defaultConfig;
            }
            return this.data[dataSource];
        },
        WPMs: function() {
            var dataSource = this.dataSource;
            // For back-compatibility.
            if (!dataSource.WPMs) {
                dataSource.WPMs = [];
            }
            return dataSource.WPMs;
        },
        averageWPM: function() {
            var dataSource = this.dataSource;
            if ($.isEmptyObject(dataSource.WPMs)) {
                return 0;
            }

            var sum = dataSource.WPMs.reduce(function(a, b) { return (a + b) }, 0);
            var average = sum / dataSource.WPMs.length;
            return Math.round(average);
        },
    },
    mounted: function() {
        if (localStorage.ngramTypeAppdata != undefined) {
            this.load();
            var dataSource = this.dataSource;
            this.expectedPhrase = dataSource.phrases[dataSource.phrasesCurrentIndex];

            // Back-compatibility for those existing users
            // to avoid issues with the newly added Pentagrams (5-grams),
            // and the renaming of Quadgrams to Tetragrams:
            var defaultConfig = {
                combination: 2,
                repetition: 3,
                minimumWPM: 40,
                minimumAccuracy: 100,
                WPMs: [],
                phrases: {},
                phrasesCurrentIndex: 0,
            };
            if (!this.data.tetragrams) {
                this.data.tetragrams = this.data.quadgrams;
            }
            if (!this.data.pentagrams) {
                this.data.pentagrams = this.deepCopy(defaultConfig);
            }
            if (!this.data.words_200_fil) {
                this.data.words_200_fil = this.deepCopy(defaultConfig);
            }
            if (typeof(this.data.soundEnabled) == 'undefined') {
                this.data.soundEnabled = true;
            }
        }

        else {
            this.refreshPhrases();
        }

        // Use jQuery instead of Vue for intercepting the <TAB> key.
        var that = this;
        $('#input-typing').on('keydown', function(e) {
            if (e.originalEvent.code == 'Tab') {
                e.preventDefault();
                that.resetCurrentPhraseMetrics();
            }
        });

        this.correctLetterSound = new Audio('./media/sounds/click.mp3');
        this.incorrectLetterSound = new Audio('./media/sounds/clack.mp3');
        this.incorrectPhraseSound = new Audio('./media/sounds/failed.mp3');
        this.correctPhraseSound = new Audio('./media/sounds/ding.wav');
        this.currentPlayingSound = null;
    },
    watch: {
        'data.source': function() {
            var dataSource = this.dataSource;
            if ($.isEmptyObject(dataSource.phrases)) {
                this.refreshPhrases();
            }

            else {
                this.expectedPhrase = dataSource.phrases[dataSource.phrasesCurrentIndex];
                // Save state in case of page reload.
                this.save();
            }

            this.resetCurrentPhraseMetrics();
        },
        'data.soundCorrectLetterEnabled': function() {
            this.save();
        },
        'data.soundIncorrectLetterEnabled': function() {
            this.save();
        },
        'data.soundPassedThresholdEnabled': function() {
            this.save();
        },
        'data.soundFailedThresholdEnabled': function() {
            this.save();
        },
        custom_words: function() {
            this.refreshPhrases();
            // Save state in case of page reload.
            this.save();
            this.resetCurrentPhraseMetrics();
        },
        typedPhrase: function() {
            // Make sure to reset any error color when moving to next lesson,
            // lesson being reset, all chars being deleted, etc.
            if (!this.typedPhrase.length) {
                this.resetCurrentPhraseMetrics();
            }

            if (this.typedPhrase.length == 1) {
                this.startTime = new Date().getTime() / 1000;
            }
        },
        WPMs: function() {
            return this.averageWPM;
        },
    },
    methods: {
        _migrateSoundSetting: function(soundSetting) {
            var existingGlobalSoundSetting = this.data.soundEnabled;

            if (!this.data.hasOwnProperty(soundSetting)) {
                this.data[soundSetting] = existingGlobalSoundSetting;
            }
        },
        _migrateSoundSettings: function() {
            this._migrateSoundSetting('soundCorrectLetterEnabled');
            this._migrateSoundSetting('soundIncorrectLetterEnabled');
            this._migrateSoundSetting('soundPassedThresholdEnabled');
            this._migrateSoundSetting('soundFailedThresholdEnabled');
        },
        save: function() {
            localStorage.ngramTypeAppdata = JSON.stringify(this.data);
        },
        load: function () {
            this.data = JSON.parse(localStorage.ngramTypeAppdata);

            // For existing users, the new sound settings
            // are not yet existing, so we set them
            // using the previous/global sound setting.
            this._migrateSoundSettings();
        },
        deepCopy: function(arrayOrObject) {
            var emptyArrayOrObject = $.isArray(arrayOrObject) ? [] : {};
            return $.extend(true, emptyArrayOrObject, arrayOrObject);
        },
        shuffle: function(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        },
        stopCurrentPlayingSound: function() {
            // Sounds at the end of each phrase/lesson
            // dont need to be played from the beginning.
            if (
                this.currentPlayingSound == this.correctPhraseSound
                || this.currentPlayingSound == this.incorrectPhraseSound
            ) {
                return;
            }

            // Reset any playing sound to handle fast typing,
            // Otherwise, the sound will be intermittent and
            // not in sync with the key presses.
            if (this.currentPlayingSound) {
                this.currentPlayingSound.currentTime = 0;
            }

        },
        refreshPhrases: function() {
            var dataSource = this.dataSource;
            dataSource.phrases = this.generatePhrases(dataSource.combination, dataSource.repetition);
            this.expectedPhrase = dataSource.phrases[0];
            dataSource.phrasesCurrentIndex = 0;
            this.save();
        },
        generatePhrases: function(numberOfItemsToCombine, repetitions) {
            var dataSource = this.data['source'];
            if (dataSource === 'custom_words') {
                // User has set the custom words.
                if (this.custom_words) {
                    dataSource = 'custom_words';
                }
                // Pangrams as default.
                else {
                    dataSource = 'pangrams';
                }
            }
            var ngrams = this.deepCopy(this[dataSource]);
            this.shuffle(ngrams);
            var ngramsProcessed = 0;
            var phrases = [];

            while (ngrams.length) {
                var ngramsSublist = ngrams.slice(0, numberOfItemsToCombine);
                var subPhrase = ngramsSublist.join(' ');
                var _phrase = [];
                for (var i = 0; i < repetitions; i++) {
                    _phrase.push(subPhrase);
                }
                phrases.push(_phrase.join(' '));
                // Remove the processed ngrams.
                ngrams.splice(0, numberOfItemsToCombine);
            }

            return phrases
        },
        pauseTimer: function(e) {
            var isStopped = $('.timer').countimer('stopped');
            if (!isStopped) {
                $('.timer').countimer('stop');
            }
        },
        resumeTimer: function(e) {
            var isStopped = $('.timer').countimer('stopped');
            if (isStopped) {
                $('.timer').countimer('resume');
            }
        },
        keyHandler: function(e) {
            var key = e.key;

            if (key == 'Escape') {
                this.resetCurrentPhraseMetrics();
                return;
            }

            // For other miscellaneous keys.
            if (key.length > 1) {
                return;
            }

            // Remove spaces at starting of the phrase
            var typedPhrase = this.typedPhrase.trimStart();
            if (!typedPhrase.length) {
                return;
            }

            this.resumeTimer()

            if (this.expectedPhrase.startsWith(typedPhrase)) {
                if (this.data.soundCorrectLetterEnabled) {
                    this.stopCurrentPlayingSound();
                    this.correctLetterSound.play();
                    this.currentPlayingSound = this.correctLetterSound;
                }
                this.isInputCorrect = true;
                this.hitsCorrect += 1;
            }
            else if (this.expectedPhrase !== typedPhrase.trimEnd()) {
                if (this.data.soundIncorrectLetterEnabled) {
                    this.stopCurrentPlayingSound();
                    this.incorrectLetterSound.play();
                    this.currentPlayingSound = this.incorrectLetterSound;
                }
                this.isInputCorrect = false;
                this.hitsWrong += 1;
            }

            if (typedPhrase.trimEnd() === this.expectedPhrase) {
                var currentTime = new Date().getTime() / 1000;
                this.rawWPM = Math.round(
                    // 5 chars equals 1 word.
                    ((this.hitsCorrect + this.hitsWrong) / 5) / (currentTime - this.startTime) * 60
                );

                this.accuracy = Math.round(
                    this.hitsCorrect / (this.hitsCorrect + this.hitsWrong) * 100
                );

                var dataSource = this.dataSource;
                if (
                    this.rawWPM < dataSource.minimumWPM
                    || this.accuracy < dataSource.minimumAccuracy
                ) {
                    if (this.data.soundFailedThresholdEnabled) {
                        this.stopCurrentPlayingSound();
                        this.incorrectPhraseSound.play();
                        this.currentPlayingSound = this.incorrectPhraseSound;
                    }
                    this.resetCurrentPhraseMetrics();
                    this.pauseTimer()
                    return;
                }

                // For back-compatibility,
                // or when starting a new round in the same lesson.
                var newRoundStarted = (dataSource.phrasesCurrentIndex == 0);
                if (!dataSource.WPMs || newRoundStarted) {
                    dataSource.WPMs = [];
                }
                dataSource.WPMs.push(this.rawWPM);

                if (this.data.soundPassedThresholdEnabled) {
                    this.stopCurrentPlayingSound();
                    this.correctPhraseSound.play();
                    this.currentPlayingSound = this.correctPhraseSound;
                }
                this.pauseTimer()
                this.nextPhrase();
            }
        },
        resetCurrentPhraseMetrics: function() {
            this.hitsCorrect = 0;
            this.hitsWrong = 0;
            this.typedPhrase = '';
            this.isInputCorrect = true;
        },
        nextPhrase: function() {
            this.resetCurrentPhraseMetrics();
            var dataSource = this.dataSource;
            var nextPhraseExists = (dataSource.phrases.length > dataSource.phrasesCurrentIndex + 1);
            if (nextPhraseExists) {
                dataSource.phrasesCurrentIndex += 1;
                this.expectedPhrase = dataSource.phrases[dataSource.phrasesCurrentIndex];
                this.save();
            }
            // Start again from beginning, but generate new data.
            else {
                this.refreshPhrases();
            }
        },
        customWordsModalShow: function() {
            var $customWordsModal = $('#custom-words-modal');
            var customWords = (this.custom_words || this.pangrams).join('\n')
            $customWordsModal.find('textarea').val(customWords);
        },
        customWordsModalSubmit: function() {
            var $customWordsModal = $('#custom-words-modal');
            var customWordsSubmitted = $customWordsModal.find('textarea').val();
            // Convert to array, remove the empty string.
            var customWordsProccessed = customWordsSubmitted.split(/\s+/).filter(function(element) {return element});
            $customWordsModal.modal("hide");
            this.custom_words = customWordsProccessed;
        },
    },
};

var ngramTypeApp = new Vue(ngramTypeConfig);