{
  description = "阴阳师桌面版 (Onmyoji Desktop / PC互通版) Nix 启动环境，中文字体渲染优化与独立隔离";

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
            pname = "onmyoji-launcher";
            version = "1.0.0";
            src = ./.;

            nativeBuildInputs = [ pkgs.makeWrapper ];

            installPhase = ''
              mkdir -p $out/bin $out/share/applications $out/share/icons/hicolor/256x256/apps
              cp bin/onmyoji-launcher $out/bin/onmyoji-launcher
              chmod +x $out/bin/onmyoji-launcher
              cp share/fonts.reg $out/share/fonts.reg
              cp share/onmyoji.png $out/share/icons/hicolor/256x256/apps/onmyoji.png
              cp share/onmyoji.png $out/share/onmyoji.png

              # 安装桌面入口 .desktop 文件
              substitute share/onmyoji.desktop $out/share/applications/onmyoji.desktop \
                --replace-fail "Exec=onmyoji-launcher" "Exec=$out/bin/onmyoji-launcher"

              wrapProgram $out/bin/onmyoji-launcher \
                --prefix PATH : ${pkgs.lib.makeBinPath [
                  winePkg
                  pkgs.dxvk.out
                  pkgs.winetricks
                  pkgs.curl
                  pkgs.coreutils
                  pkgs.findutils
                  pkgs.gnused
                  pkgs.gnugrep
                  pkgs.p7zip
                  pkgs.cabextract
                  pkgs.python3
                ]} \
                --set NOTO_CJK_FONT_PATH "${pkgs.noto-fonts-cjk-sans}/share/fonts/opentype/noto-cjk/NotoSansCJK-VF.otf.ttc" \
                --set WQY_FONT_PATH "${pkgs.wqy_zenhei}/share/fonts/wqy-zenhei/wqy-zenhei.ttc" \
                --set ONMYOJI_FONTS_REG "$out/share/fonts.reg" \
                --set ONMYOJI_SHARE_DIR "$out/share"
            '';
          };
        in {
          default = launcher;
          onmyoji = launcher;
        }
      );

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/onmyoji-launcher";
        };
        onmyoji = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/onmyoji-launcher";
        };
      });

      devShells = forAllSystems (system:
        let
          pkgs = pkgsFor system;
        in {
          default = pkgs.mkShell {
            packages = [
              pkgs.wineWow64Packages.staging
              pkgs.dxvk.out
              pkgs.winetricks
              pkgs.noto-fonts-cjk-sans
              pkgs.wqy_zenhei
              pkgs.curl
              pkgs.p7zip
              pkgs.cabextract
              pkgs.python3
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
