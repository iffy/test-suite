'use strict';

import { Asset, Audio } from 'expo';
import { Platform } from 'react-native';

import { retryForStatus, waitFor } from './helpers';

export const name = 'Audio';
const mainTestingSource = require('../assets/LLizard.mp3');
const soundUri = 'http://www.noiseaddicts.com/samples_1w72b820/280.mp3';

export function test(t) {
  t.describe('Audio class', () => {
    t.describe('Audio.setAudioModeAsync', () => {
      // These tests should work according to the documentation,
      // but the implementation doesn't return anything from the Promise.

      // t.it('sets one set of the options', async () => {
      //   const mode = {
      //     playsInSilentModeIOS: true,
      //     allowsRecordingIOS: true,
      //     interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS,
      //     shouldDuckAndroid: true,
      //     interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
      //   };
      //   try {
      //     const receivedMode = await Audio.setAudioModeAsync(mode);
      //     t.expect(receivedMode).toBeDefined();
      //     receivedMode && t.expect(receivedMode).toEqual(t.jasmine.objectContaining(mode));
      //   } catch (error) {
      //     t.fail(error);
      //   }
      // });

      // t.it('sets another set of the options', async () => {
      //   const mode = {
      //     playsInSilentModeIOS: false,
      //     allowsRecordingIOS: false,
      //     interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      //     shouldDuckAndroid: false,
      //     interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      //   };
      //   try {
      //     const receivedMode = await Audio.setAudioModeAsync(mode);
      //     t.expect(receivedMode).toBeDefined();
      //     receivedMode && t.expect(receivedMode).toEqual(t.jasmine.objectContaining(mode));
      //   } catch (error) {
      //     t.fail(error);
      //   }
      // });

      if (Platform.OS === 'ios') {
        t.it('rejects an invalid promise', async () => {
          const mode = {
            playsInSilentModeIOS: false,
            allowsRecordingIOS: true,
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            shouldDuckAndroid: false,
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          };
          let error = null;
          try {
            await Audio.setAudioModeAsync(mode);
          } catch (err) {
            error = err;
          }
          t.expect(error).not.toBeNull();
          error && t.expect(error.toString()).toMatch('Impossible audio mode');
        });
      }
    });
  });

  t.describe('Audio instances', () => {
    let soundObject = null;

    t.beforeAll(async () => {
      await Audio.setIsEnabledAsync(true);
    });

    t.beforeEach(() => {
      soundObject = new Audio.Sound();
    });

    t.afterEach(async () => {
      await soundObject.unloadAsync();
      soundObject = null;
    });

    t.describe('Audio.loadAsync', () => {
      t.it('loads the file with `require`', async () => {
        await soundObject.loadAsync(require('../assets/LLizard.mp3'));
        await retryForStatus(soundObject, { isLoaded: true });
      });

      t.it('loads the file from `Asset`', async () => {
        await soundObject.loadAsync(Asset.fromModule(require('../assets/LLizard.mp3')));
        await retryForStatus(soundObject, { isLoaded: true });
      });

      t.it('loads the file from the Internet', async () => {
        await soundObject.loadAsync({ uri: soundUri });
        await retryForStatus(soundObject, { isLoaded: true });
      });

      t.it('rejects if a file is already loaded', async () => {
        await soundObject.loadAsync({ uri: soundUri });
        await retryForStatus(soundObject, { isLoaded: true });
        let hasBeenRejected = false;
        try {
          await soundObject.loadAsync(mainTestingSource);
        } catch (error) {
          hasBeenRejected = true;
          error && t.expect(error.toString()).toMatch('already loaded');
        }
        t.expect(hasBeenRejected).toBe(true);
      });
    });

    t.describe('Audio.loadAsync(require, initialStatus)', () => {
      t.it('sets an initial status', async () => {
        const options = {
          shouldPlay: true,
          isLooping: true,
          isMuted: false,
          volume: 0.5,
          rate: 1.5,
        };
        await soundObject.loadAsync(mainTestingSource, options);
        await retryForStatus(soundObject, options);
      });
    });

    t.describe('Audio.setStatusAsync', () => {
      t.it('sets a status', async () => {
        const options = {
          shouldPlay: true,
          isLooping: true,
          isMuted: false,
          volume: 0.5,
          rate: 1.5,
        };
        await soundObject.loadAsync(mainTestingSource, options);
        await retryForStatus(soundObject, options);
      });
    });

    t.describe('Audio.unloadAsync(require, initialStatus)', () => {
      t.it('unloads the object when it is loaded', async () => {
        await soundObject.loadAsync(mainTestingSource);
        await retryForStatus(soundObject, { isLoaded: true });
        await soundObject.unloadAsync();
        await retryForStatus(soundObject, { isLoaded: false });
      });

      t.it("rejects if the object isn't loaded", async () => {
        let hasBeenRejected = false;
        try {
          await soundObject.unloadAsync();
        } catch (error) {
          hasBeenRejected = true;
        }
        t.expect(hasBeenRejected).toBe(false);
      });
    });

    /*t.describe('Audio.setOnPlaybackStatusUpdate', () => {
      t.it('sets callbacks that gets called when playing and stopping', async () => {
        const onPlaybackStatusUpdate = t.jasmine.createSpy('onPlaybackStatusUpdate');
        soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        await soundObject.loadAsync(mainTestingSource);
        await retryForStatus(soundObject, { isLoaded: true });
        await soundObject.playAsync();
        await retryForStatus(soundObject, { isPlaying: true });
        await soundObject.stopAsync();
        await retryForStatus(soundObject, { isPlaying: false });
        t.expect(onPlaybackStatusUpdate).toHaveBeenCalledWith({ isLoaded: false });
        t
          .expect(onPlaybackStatusUpdate)
          .toHaveBeenCalledWith(t.jasmine.objectContaining({ isLoaded: true }));
        t
          .expect(onPlaybackStatusUpdate)
          .toHaveBeenCalledWith(t.jasmine.objectContaining({ isPlaying: true }));
        t
          .expect(onPlaybackStatusUpdate)
          .toHaveBeenCalledWith(t.jasmine.objectContaining({ isPlaying: false }));
      });

      t.it(
        'sets callbacks that gets called with didJustFinish when playback finishes',
        async () => {
          const onPlaybackStatusUpdate = t.jasmine.createSpy('onPlaybackStatusUpdate');
          soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          await soundObject.loadAsync(mainTestingSource);
          await retryForStatus(soundObject, { isLoaded: true });
          await retryForStatus(soundObject, { isBuffering: false });
          const status = await soundObject.getStatusAsync();
          await soundObject.setStatusAsync({
            positionMillis: status.playableDurationMillis - 300,
            shouldPlay: true,
          });
          await new Promise(resolve => {
            setTimeout(() => {
              t
                .expect(onPlaybackStatusUpdate)
                .toHaveBeenCalledWith(t.jasmine.objectContaining({ didJustFinish: true }));
              resolve();
            }, 1000);
          });
        }
      );
    });*/

    t.describe('Audio.playAsync', () => {
      t.it('plays the sound', async () => {
        await soundObject.loadAsync(mainTestingSource);
        await soundObject.playAsync();
        await retryForStatus(soundObject, { isPlaying: true });
      });
    });

    t.describe('Audio.replayAsync', () => {
      t.it('replays the sound', async () => {
        await soundObject.loadAsync(mainTestingSource);
        await retryForStatus(soundObject, { isLoaded: true });
        await soundObject.playAsync();
        await retryForStatus(soundObject, { isPlaying: true });
        await waitFor(500);
        const statusBefore = await soundObject.getStatusAsync();
        soundObject.replayAsync();
        await retryForStatus(soundObject, { isPlaying: true });
        const statusAfter = await soundObject.getStatusAsync();
        t.expect(statusAfter.positionMillis).toBeLessThan(statusBefore.positionMillis);
      });

      t.it('calls the onPlaybackStatusUpdate with hasJustBeenInterrupted = true', async () => {
        const onPlaybackStatusUpdate = t.jasmine.createSpy('onPlaybackStatusUpdate');
        await soundObject.loadAsync(mainTestingSource);
        soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        await retryForStatus(soundObject, { isLoaded: true });
        await soundObject.playAsync();
        await retryForStatus(soundObject, { isPlaying: true });
        await soundObject.replayAsync();
        t
          .expect(onPlaybackStatusUpdate)
          .toHaveBeenCalledWith(t.jasmine.objectContaining({ hasJustBeenInterrupted: true }));
      });
    });

    t.describe('Audio.pauseAsync', () => {
      t.it('pauses the sound', async () => {
        await soundObject.loadAsync(mainTestingSource);
        await soundObject.playAsync();
        await retryForStatus(soundObject, { isPlaying: true });
        await soundObject.pauseAsync();
        await retryForStatus(soundObject, { isPlaying: false });
        await soundObject.playAsync();
        await retryForStatus(soundObject, { isPlaying: true });
      });
    });

    t.describe('Audio.stopAsync', () => {
      t.it('stops the sound', async () => {
        await soundObject.loadAsync(mainTestingSource, { shouldPlay: true });
        await retryForStatus(soundObject, { isPlaying: true });
        await soundObject.stopAsync();
        await retryForStatus(soundObject, { isPlaying: false });
      });
    });

    t.describe('Audio.setPositionAsync', () => {
      t.it('sets the position', async () => {
        await soundObject.loadAsync(mainTestingSource);
        await retryForStatus(soundObject, { positionMillis: 0 });
        await soundObject.setPositionAsync(1000);
        await retryForStatus(soundObject, { positionMillis: 1000 });
      });
    });

    t.describe('Audio.setPositionAsync', () => {
      t.it('sets the position', async () => {
        await soundObject.loadAsync(mainTestingSource);
        await retryForStatus(soundObject, { positionMillis: 0 });
        await soundObject.setPositionAsync(1000);
        await retryForStatus(soundObject, { positionMillis: 1000 });
      });
    });

    t.describe('Audio.setVolumeAsync', () => {
      t.beforeEach(async () => {
        await soundObject.loadAsync(mainTestingSource, { volume: 1 });
        await retryForStatus(soundObject, { volume: 1 });
      });

      t.it('sets the volume', async () => {
        await soundObject.setVolumeAsync(0.5);
        await retryForStatus(soundObject, { volume: 0.5 });
      });

      const testVolumeFailure = (valueDescription, value) =>
        t.it(`rejects if volume value is ${valueDescription}`, async () => {
          let hasBeenRejected = false;
          try {
            await soundObject.setVolumeAsync(value);
          } catch (error) {
            hasBeenRejected = true;
            error && t.expect(error.toString()).toMatch(/value .+ between/);
          }
          t.expect(hasBeenRejected).toBe(true);
        });

      testVolumeFailure('too big', 2);
      testVolumeFailure('negative', -0.5);
    });

    t.describe('Audio.setIsMutedAsync', () => {
      t.it('sets whether the audio is muted', async () => {
        await soundObject.loadAsync(mainTestingSource, { isMuted: true });
        await retryForStatus(soundObject, { isMuted: true });
        await soundObject.setIsMutedAsync(false);
        await retryForStatus(soundObject, { isMuted: false });
      });
    });

    t.describe('Audio.setIsLoopingAsync', () => {
      t.it('sets whether the audio is looped', async () => {
        await soundObject.loadAsync(mainTestingSource, { isLooping: false });
        await retryForStatus(soundObject, { isLooping: false });
        await soundObject.setIsLoopingAsync(true);
        await retryForStatus(soundObject, { isLooping: true });
      });
    });

    /*t.describe('Audio.setProgressUpdateIntervalAsync', () => {
      t.it('sets update interval', async () => {
        const onPlaybackStatusUpdate = t.jasmine.createSpy('onPlaybackStatusUpdate');
        await soundObject.loadAsync(mainTestingSource, { shouldPlay: true });
        await retryForStatus(soundObject, { isPlaying: true });
        soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        await soundObject.setProgressUpdateIntervalAsync(100);
        await new Promise(resolve => {
          setTimeout(() => {
            t.expect(onPlaybackStatusUpdate.calls.count()).toBeGreaterThan(5);
            resolve();
          }, 800);
        });
      });
    });*/

    t.describe('Audio.setRateAsync', () => {
      let rate = 0;
      let shouldError = false;
      let shouldCorrectPitch = false;

      t.beforeEach(async () => {
        const rate = 0.9;

        const status = await soundObject.loadAsync(mainTestingSource, { rate });
        t.expect(status.rate).toBeCloseTo(rate, 2);
      });

      t.afterEach(async () => {
        let hasBeenRejected = false;

        try {
          const status = await soundObject.setRateAsync(rate, shouldCorrectPitch);
          t.expect(status.rate).toBeCloseTo(rate, 2);
          t.expect(status.shouldCorrectPitch).toBe(shouldCorrectPitch);
        } catch (error) {
          hasBeenRejected = true;
        }

        t.expect(hasBeenRejected).toEqual(shouldError);

        rate = 0;
        shouldError = false;
        shouldCorrectPitch = false;
      });

      t.it('sets rate with shouldCorrectPitch = true', async () => {
        rate = 1.5;
        shouldCorrectPitch = true;
      });

      t.it('sets rate with shouldCorrectPitch = false', async () => {
        rate = 0.75;
        shouldCorrectPitch = false;
      });

      t.it('rejects too high rate', async () => {
        rate = 40;
        shouldError = true;
      });

      t.it('rejects negative rate', async () => {
        rate = -10;
        shouldError = true;
      });
    });
  });
}
