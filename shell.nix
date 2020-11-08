with import <nixpkgs> {};
with pkgs.python37Packages;

stdenv.mkDerivation {
  name = "parity-server";
  buildInputs = [
    nodejs-14_x
    (yarn.override { nodejs = nodejs-14_x; })
    postgresql
    python37Full
    python37Packages.setuptools
    python37Packages.virtualenv
  ];

  shellHook = ''
    SOURCE_DATE_EPOCH=$(date +%s)
    virtualenv --no-setuptools venv
    source venv/bin/activate
    pip install -r requirements.txt
  '';
}
