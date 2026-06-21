{
  description = "Scheinkognat — linguistische Koinzidenzen";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        runtime = with pkgs; [ nodejs_22 pnpm jq ];

        # Wrapper: lokalisiert die Projektwurzel (package.json mit "scheinkognat"),
        # installiert bei Bedarf node_modules, führt dann das Kommando aus.
        mkApp = name: cmd: {
          type = "app";
          program = toString (pkgs.writeShellScript "scheinkognat-${name}" ''
            set -euo pipefail
            export PATH=${pkgs.lib.makeBinPath runtime}:$PATH
            export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

            root="$PWD"
            while [ "$root" != "/" ] && ! grep -q '"name": "scheinkognat"' "$root/package.json" 2>/dev/null; do
              root="$(dirname "$root")"
            done
            if [ "$root" = "/" ]; then
              echo "scheinkognat: keine package.json im aktuellen Pfad gefunden" >&2
              exit 1
            fi
            cd "$root"

            if [ ! -d node_modules ]; then
              echo "→ node_modules fehlt, installiere …" >&2
              pnpm install --frozen-lockfile
            fi

            exec ${cmd} "$@"
          '');
        };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = runtime;
          shellHook = ''
            export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
            echo "scheinkognat dev shell — node $(node -v), pnpm $(pnpm -v)"
          '';
        };

        apps = {
          new-entry = mkApp "new-entry" "pnpm exec tsx scripts/new-entry.ts";
          validate = mkApp "validate" "pnpm exec tsx scripts/validate.ts";
          fetch-coords = mkApp "fetch-coords" "pnpm exec tsx scripts/fetch-glottolog-coords.ts";
          issue-to-pr = mkApp "issue-to-pr" "pnpm exec tsx scripts/issue-to-pr.ts";
          dev = mkApp "dev" "pnpm exec astro dev";
          build = mkApp "build" "pnpm run build";
          default = mkApp "new-entry" "pnpm exec tsx scripts/new-entry.ts";
        };
      });
}
