import hashlib
import io
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from package_playable import CLASSIC_SOURCE, PLAYABLE, prepare


def commit(root):
    subprocess.run(['git', '-C', str(root), 'add', '.'], check=True)
    subprocess.run([
        'git', '-C', str(root), '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
        '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture',
    ], check=True)


class PlayablePackageTest(unittest.TestCase):
    def test_current_games_and_checksums_are_exact_and_deterministic(self):
        commit_id, payload = prepare(ROOT)
        self.assertEqual(prepare(ROOT), (commit_id, payload))
        with zipfile.ZipFile(io.BytesIO(payload)) as z:
            self.assertIsNone(z.testzip())
            self.assertEqual(z.namelist(), [*PLAYABLE, 'START-HERE.txt', 'SHA256SUMS.txt'])
            self.assertIn(commit_id.encode(), z.read('START-HERE.txt'))
            for line in z.read('SHA256SUMS.txt').decode().splitlines():
                digest, member = line.split('  ', 1)
                self.assertEqual(hashlib.sha256(z.read(member)).hexdigest(), digest)
            for member in PLAYABLE:
                self.assertEqual(z.read(member), (ROOT / 'dist' / member).read_bytes())

    def test_missing_modified_and_divergent_html_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            subprocess.run(['git', '-C', folder, 'init', '-q'], check=True)
            for path in [CLASSIC_SOURCE, *(f'dist/{name}' for name in PLAYABLE)]:
                fixture = root / path
                fixture.parent.mkdir(exist_ok=True)
                fixture.write_bytes(b'fixture')
            commit(root)
            frontier = root / 'dist' / PLAYABLE[0]
            frontier.unlink()
            with self.assertRaises(FileNotFoundError):
                prepare(root)
            frontier.write_bytes(b'untracked change')
            with self.assertRaisesRegex(ValueError, 'does not match'):
                prepare(root)
            frontier.write_bytes(b'fixture')
            (root / CLASSIC_SOURCE).write_bytes(b'a different committed classic')
            commit(root)
            with self.assertRaisesRegex(ValueError, 'legacy source'):
                prepare(root)

    def test_cli_does_not_overwrite_an_existing_output(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'existing.zip'
            output.write_bytes(b'last good')
            result = subprocess.run(
                [sys.executable, str(ROOT / 'scripts/package_playable.py'), '--output', str(output)],
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(output.read_bytes(), b'last good')


if __name__ == '__main__':
    unittest.main()
