{
  description = "阴阳师桌面版 (MuMu专版 / 互通版) Nix 启动环境，中文字体渲染优化与独立隔离";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      pkgsFor = system: import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };
    in {
      packages = forAllSystems (system:
        let
          pkgs = pkgsFor system;
          winePkg = pkgs.wineWow64Packages.staging;
          launcher = pkgs.stdenv.mkDerivation {
            pname = "yys-launcher";
            version = "1.0.0";
            src = ./.;

            nativeBuildInputs = [ pkgs.makeWrapper ];

            installPhase = ''
              mkdir -p $out/bin $out/share
              cp bin/yys-launcher $out/bin/yys-launcher
              chmod +x $out/bin/yys-launcher
              cp share/fonts.reg $out/share/fonts.reg

              wrapProgram $out/bin/yys-launcher \
                --prefix PATH : ${pkgs.lib.makeBinPath [
                  winePkg
                  pkgs.winetricks
                  pkgs.curl
                  pkgs.coreutils
                  pkgs.findutils
                  pkgs.gnused
                  pkgs.gnugrep
                  pkgs.p7zip
                  pkgs.cabextract
                ]} \
                --set NOTO_CJK_FONT_PATH "${pkgs.noto-fonts-cjk-sans}/share/fonts/opentype/noto-cjk/NotoSansCJK-VF.otf.ttc" \
                --set WQY_FONT_PATH "${pkgs.wqy_zenhei}/share/fonts/wqy-zenhei/wqy-zenhei.ttc" \
                --set YYS_FONTS_REG "$out/share/fonts.reg"
            '';
          };
        in {
          default = launcher;
          yys = launcher;
        }
      );

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/yys-launcher";
        };
      });

      devShells = forAllSystems (system:
        let
          pkgs = pkgsFor system;
        in {
          default = pkgs.mkShell {
            packages = [
              pkgs.wineWow64Packages.staging
              pkgs.winetricks
              pkgs.noto-fonts-cjk-sans
              pkgs.wqy_zenhei
              pkgs.curl
              pkgs.p7zip
              pkgs.cabextract
            ];
            shellHook = ''
              export NOTO_CJK_FONT_PATH="${pkgs.noto-fonts-cjk-sans}/share/fonts/opentype/noto-cjk/NotoSansCJK-VF.otf.ttc"
              export WQY_FONT_PATH="${pkgs.wqy_zenhei}/share/fonts/wqy-zenhei/wqy-zenhei.ttc"
            '';
          };
        }
      );
    };
}
