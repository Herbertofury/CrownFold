"""Package the two exact tracked playable HTML files, without changing or releasing them."""
import argparse
import hashlib
import io
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PLAYABLE = ('CROWNFOLD-RIFTFRONT.html', 'CROWNFOLD-ORIGINAL.html')
CLASSIC_SOURCE = 'legacy/CROWNFOLD-ORIGINAL.html'


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])


def prepare(root):
    commit = git(root, 'rev-parse', 'HEAD').decode('ascii').strip()

    def checked(path):
        current = (root / path).read_bytes()
        if not current or current != git(root, 'show', f'{commit}:{path}'):
            raise ValueError(f'{path} does not match the checked-out commit; rebuild and commit before packaging.')
        return current

    contents = {name: checked(f'dist/{name}') for name in PLAYABLE}
    if contents[PLAYABLE[1]] != checked(CLASSIC_SOURCE):
        raise ValueError('The generated original board game differs from its tracked legacy source.')
    contents['START-HERE.txt'] = (
        'CrownFold experimental offline browser builds\n'
        f'Source checkout: {commit}\n\n'
        f'{PLAYABLE[0]}: open world and War Rifts.\n'
        f'{PLAYABLE[1]}: original 3D board game (use solo mode for offline play).\n\n'
        'Extract the ZIP before opening either HTML file in a desktop browser. No installer.\n'
        'Keep using the same extracted file path and browser profile for local saves.\n'
        'Moving the HTML or changing profiles can hide existing progress. Keep the old copy.\n'
        'This is a browser playtest package, not a native build or a finished release.\n'
    ).encode('utf-8')
    contents['SHA256SUMS.txt'] = ''.join(
        f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name, data in contents.items()
    ).encode('ascii')
    # Fix timestamps, permissions and member order for byte-for-byte reproducibility.
    # Store already bounded HTML bytes verbatim; the GitHub outer archive compresses them.
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w') as archive:
        for name, member in contents.items():
            info = zipfile.ZipInfo(name)
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, member)
    return commit, data.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        commit, data = prepare(ROOT)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('xb') as output:
            output.write(data)
    except (OSError, ValueError, subprocess.CalledProcessError) as err:
        parser.exit(1, f'Could not package CrownFold: {err}\n')
    print(f'{commit} {hashlib.sha256(data).hexdigest()} {args.output}')


if __name__ == '__main__':
    main()
