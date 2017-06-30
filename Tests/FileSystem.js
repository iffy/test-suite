'use strict';

export const name = 'FileSystem';

import { FileSystem as FS } from 'expo';

export function test(t) {
  t.fdescribe('FileSystem', () => {
    t.it(
      'delete(idempotent) -> !exists -> download(md5, uri) -> exists ' +
        '-> delete -> !exists',
      async () => {
        const filename = 'download1.png';

        const assertExists = async expectedToExist => {
          let { exists } = await FS.getInfoAsync(filename, {});
          if (expectedToExist) {
            t.expect(exists).toBeTruthy();
          } else {
            t.expect(exists).not.toBeTruthy();
          }
        };

        await FS.deleteAsync(filename, {
          idempotent: true,
        });
        await assertExists(false);

        const {
          md5,
          uri,
        } = await FS.downloadAsync(
          'https://s3-us-west-1.amazonaws.com/test-suite-data/avatar2.png',
          filename,
          { md5: true }
        );
        t.expect(md5).toBe('1e02045c10b8f1145edc7c8375998f87');
        // NOTE: Is the below a sensible invariant to check?
        t.expect(uri.slice(-filename.length)).toBe(filename);
        await assertExists(true);

        await FS.deleteAsync(filename, {});
        await assertExists(false);
      },
      9000
    );

    t.it('delete(idempotent) -> delete[error]', async () => {
      const filename = 'willDelete.png';

      await FS.deleteAsync(filename, {
        idempotent: true,
      });

      let error;
      try {
        await FS.deleteAsync(filename, {});
      } catch (e) {
        error = e;
      }
      t.expect(error.message).toMatch(/not.*found/);
    });

    t.it(
      'download(md5, uri) -> read -> delete -> !exists -> read[error]',
      async () => {
        const filename = 'download1.txt';

        const {
          md5,
          uri,
        } = await FS.downloadAsync(
          'https://s3-us-west-1.amazonaws.com/test-suite-data/text-file.txt',
          filename,
          { md5: true }
        );
        t.expect(md5).toBe('86d73d2f11e507365f7ea8e7ec3cc4cb');

        const string = await FS.readAsStringAsync(filename, {});
        t.expect(string).toBe('hello, world\nthis is a test file\n');

        await FS.deleteAsync(filename, {
          idempotent: true,
        });

        let error;
        try {
          await FS.readAsStringAsync(filename, {});
        } catch (e) {
          error = e;
        }
        t.expect(error).toBeTruthy();
      },
      9000
    );

    t.it(
      'delete(idempotent) -> !exists -> write -> read -> write -> read',
      async () => {
        const filename = 'write1.txt';

        await FS.deleteAsync(filename, {
          idempotent: true,
        });

        const { exists } = await FS.getInfoAsync(filename, {});
        t.expect(exists).not.toBeTruthy();

        const writeAndVerify = async expected => {
          await FS.writeAsStringAsync(filename, expected, {});
          const string = await FS.readAsStringAsync(filename, {});
          t.expect(string).toBe(expected);
        };

        await writeAndVerify('hello, world');
        await writeAndVerify('hello, world!!!!!!');
      }
    );

    t.it(
      'delete(new) -> 2 * [write -> move -> !exists(orig) -> read(new)]',
      async () => {
        const from = 'from.txt';
        const to = 'to.txt';
        const contents = ['contents 1', 'contents 2'];

        await FS.deleteAsync(to, {
          idempotent: true,
        });

        // Move twice to make sure we can overwrite
        for (let i = 0; i < 2; ++i) {
          await FS.writeAsStringAsync(from, contents[i], {});

          await FS.moveAsync({ from, to });

          const { exists } = await FS.getInfoAsync(from, {});
          t.expect(exists).not.toBeTruthy();

          t.expect(await FS.readAsStringAsync(to, {})).toBe(contents[i]);
        }
      }
    );

    t.it(
      'delete(new) -> 2 * [write -> copy -> exists(orig) -> read(new)]',
      async () => {
        const from = 'from.txt';
        const to = 'to.txt';
        const contents = ['contents 1', 'contents 2'];

        await FS.deleteAsync(to, {
          idempotent: true,
        });

        // Copy twice to make sure we can overwrite
        for (let i = 0; i < 2; ++i) {
          await FS.writeAsStringAsync(from, contents[i], {});

          await FS.copyAsync({ from, to });

          const { exists } = await FS.getInfoAsync(from, {});
          t.expect(exists).toBeTruthy();

          t.expect(await FS.readAsStringAsync(to, {})).toBe(contents[i]);
        }
      }
    );

    t.it(
      'delete(dir) -> write(dir/file)[error] -> mkdir(dir) ->' +
        'mkdir(dir)[error] -> write(dir/file) -> read',
      async () => {
        let error;
        const path = 'dir/file';
        const dir = 'dir';
        const contents = 'hello, world';

        await FS.deleteAsync(dir, {
          idempotent: true,
        });

        error = null;
        try {
          await FS.writeAsStringAsync(path, contents, {});
        } catch (e) {
          error = e;
        }
        t.expect(error).toBeTruthy();

        await FS.makeDirectoryAsync(dir, {});

        error = null;
        try {
          await FS.makeDirectoryAsync(dir, {});
        } catch (e) {
          error = e;
        }
        t.expect(error).toBeTruthy();

        await FS.writeAsStringAsync(path, contents, {});

        t.expect(await FS.readAsStringAsync(path, {})).toBe(contents);
      }
    );

    t.it(
      'delete(dir) -> write(dir/dir2/file)[error] -> ' +
        'mkdir(dir/dir2, intermediates) -> ' +
        'mkdir(dir/dir2, intermediates) -> write(dir/dir2/file) -> read',
      async () => {
        let error;
        const path = 'dir/dir2/file';
        const dir = 'dir/dir2';
        const contents = 'hello, world';

        await FS.deleteAsync('dir', {
          idempotent: true,
        });

        error = null;
        try {
          await FS.writeAsStringAsync(path, contents, {});
        } catch (e) {
          error = e;
        }
        t.expect(error).toBeTruthy();

        await FS.makeDirectoryAsync(dir, {
          intermediates: true,
        });

        error = null;
        try {
          await FS.makeDirectoryAsync(dir, {});
        } catch (e) {
          error = e;
        }
        t.expect(error).toBeTruthy();

        await FS.writeAsStringAsync(path, contents, {});

        t.expect(await FS.readAsStringAsync(path, {})).toBe(contents);
      }
    );

    t.it(
      'delete(dir, idempotent) -> make tree -> check contents ' +
        '-> check directory listings',
      async () => {
        let error;

        await FS.deleteAsync('dir', {
          idempotent: true,
        });

        await FS.makeDirectoryAsync('dir/child1', {
          intermediates: true,
        });
        await FS.makeDirectoryAsync('dir/child2', {
          intermediates: true,
        });

        await FS.writeAsStringAsync('dir/file1', 'contents1', {});
        await FS.writeAsStringAsync('dir/file2', 'contents2', {});

        await FS.writeAsStringAsync('dir/child1/file3', 'contents3', {});

        await FS.writeAsStringAsync('dir/child2/file4', 'contents4', {});
        await FS.writeAsStringAsync('dir/child2/file5', 'contents5', {});

        const checkContents = async (path, contents) =>
          t.expect(await FS.readAsStringAsync(path, {})).toBe(contents);

        await checkContents('dir/file1', 'contents1');
        await checkContents('dir/file2', 'contents2');
        await checkContents('dir/child1/file3', 'contents3');
        await checkContents('dir/child2/file4', 'contents4');
        await checkContents('dir/child2/file5', 'contents5');

        const checkDirectory = async (path, expected) => {
          const list = await FS.readDirectoryAsync(path, {});
          t.expect(list.sort()).toEqual(expected.sort());
        };

        await checkDirectory('dir', ['file1', 'file2', 'child1', 'child2']);
        await checkDirectory('dir/child1', ['file3']);
        await checkDirectory('dir/child2', ['file4', 'file5']);

        error = null;
        try {
          await checkDirectory('dir/file1', ['nope']);
        } catch (e) {
          error = e;
        }
        t.expect(error).toBeTruthy();
      }
    );

    t.it(
      'delete(idempotent) -> download(md5) -> getInfo(size)',
      async () => {
        const filename = 'download1.png';

        await FS.deleteAsync(filename, {
          idempotent: true,
        });

        const {
          md5,
        } = await FS.downloadAsync(
          'https://s3-us-west-1.amazonaws.com/test-suite-data/avatar2.png',
          filename,
          { md5: true }
        );
        t.expect(md5).toBe('1e02045c10b8f1145edc7c8375998f87');

        const { size, modificationTime } = await FS.getInfoAsync(filename, {});
        t.expect(size).toBe(3230);
        const nowTime = 0.001 * new Date().getTime();
        t.expect(nowTime - modificationTime).toBeLessThan(3600);
        console.log(nowTime - modificationTime);

        await FS.deleteAsync(filename, {});
      },
      9000
    );

    t.it('throws out-of-scope exceptions', async () => {
      const throws = async run => {
        let error = null;
        try {
          await run();
        } catch (e) {
          error = e;
        }
        t.expect(error).toBeTruthy();
      };

      await throws(() => FS.getInfoAsync('../hello/world', {}));
      await throws(() => FS.readAsStringAsync('../hello/world', {}));
      await throws(() => FS.writeAsStringAsync('../hello/world', '', {}));
      await throws(() => FS.deleteAsync('../hello/world', {}));
      await throws(() => FS.moveAsync({ from: '../a/b', to: 'c' }));
      await throws(() => FS.moveAsync({ from: 'c', to: '../a/b' }));
      await throws(() => FS.copyAsync({ from: '../a/b', to: 'c' }));
      await throws(() => FS.copyAsync({ from: 'c', to: '../a/b' }));
      await throws(() => FS.makeDirectoryAsync('../hello/world', {}));
      await throws(() => FS.readDirectoryAsync('../hello/world', {}));
      await throws(() =>
        FS.downloadAsync('http://www.google.com', '../hello/world', {})
      );
    });
  });
}