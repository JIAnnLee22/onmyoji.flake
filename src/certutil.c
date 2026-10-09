#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>
#include <wincrypt.h>

static void do_hash(const char *path, const char *algo) {
    HANDLE h = CreateFileA(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
    if (h == INVALID_HANDLE_VALUE) return;
    ALG_ID aid = CALG_MD5;
    if (_stricmp(algo, "SHA1") == 0) aid = CALG_SHA1;
    else if (_stricmp(algo, "SHA256") == 0) aid = CALG_SHA_256;
    HCRYPTPROV p; HCRYPTHASH hash;
    if (!CryptAcquireContextA(&p, NULL, NULL, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) { CloseHandle(h); return; }
    if (!CryptCreateHash(p, aid, 0, 0, &hash)) { CryptReleaseContext(p, 0); CloseHandle(h); return; }
    BYTE buf[16384]; DWORD r;
    while (ReadFile(h, buf, sizeof(buf), &r, NULL) && r > 0) CryptHashData(hash, buf, r, 0);
    CloseHandle(h);
    BYTE out[64]; DWORD len = sizeof(out);
    if (CryptGetHashParam(hash, HP_HASHVAL, out, &len, 0)) {
        printf("%s hash of file %s:\n", algo, path);
        for (DWORD i = 0; i < len; i++) printf("%02x", out[i]);
        printf("\nCertUtil: -hashfile command completed successfully.\n");
    }
    CryptDestroyHash(hash);
    CryptReleaseContext(p, 0);
}

int main(int argc, char *argv[]) {
    if (argc >= 3 && _stricmp(argv[1], "-hashfile") == 0) {
        do_hash(argv[2], (argc >= 4) ? argv[3] : "SHA1");
    }
    return 0;
}
