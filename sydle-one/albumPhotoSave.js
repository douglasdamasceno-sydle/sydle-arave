/**
 * Script do `_save` da classe embutida "Foto do álbum" (AlbumPhoto, pacote "Galeria", br.com.arave.gallery).
 * Classe: 6afdb6cdc5ea2162a7cef8b7.
 * Roda para cada foto sempre que o Álbum é salvo: pelo serviço "Publicar fotos" ou editando o álbum no SYDLE ONE.
 *
 * Quando a foto é nova ou foi trocada:
 *   image   regravada em JPEG com o lado maior até 1920 px. O arquivo novo passa a ser desta classe
 *           e deixa de levar os metadados da câmera, como a localização GPS
 *   thumb   miniatura com o lado maior até 640 px, usada nos cards da home
 *
 * Orientação: o `resizeImage` aplica a rotação EXIF das fotos de celular, mas o `getFileExtraInfo`
 * devolve as dimensões cruas (sem a rotação). Por isso a escala é um percentual calculado pelo lado maior,
 * que é o mesmo com ou sem rotação, e a largura/altura final não é gravada.
 *
 * O `_util._fileHelper` é preguiçoso: o redimensionamento só roda na gravação do objeto.
 */

/* ===== Configuração ===== */

const LADO_MAXIMO = 1920;
const LADO_MINIATURA = 640;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];

/* No resizeImage, número decimal é percentual e inteiro é pixel: 1 seria "1 px".
   Fotos que já cabem no limite são regravadas a 99,99% (na prática, o mesmo tamanho) */
const ESCALA_MAXIMA = 0.9999;

/* ===== Processamento ===== */

const foto = _object;
const anterior = _oldObject;

// Na edição de legenda a imagem continua a mesma: nada é refeito
const imagemNova =
  Boolean(foto.image) && (!foto.thumb || !anterior || !anterior.image || anterior.image._id !== foto.image._id);

function escala(ladoMaior, limite) {
  return Math.min(ESCALA_MAXIMA, limite / ladoMaior);
}

if (imagemNova) {
  const original = foto.image;
  if (TIPOS_ACEITOS.indexOf(original.contentType) < 0) {
    throw new Error(`A foto "${original.name}" deve ser JPEG ou PNG.`);
  }

  const info = _util._fileHelper.getFileExtraInfo({ file: original }) || {};
  if (!info.width || !info.height) throw new Error(`Não foi possível ler o tamanho da foto "${original.name}".`);
  const ladoMaior = Math.max(info.width, info.height);

  // Só a largura (em percentual): o fileHelper mantém a proporção
  foto.image = _util._fileHelper.resizeImage({ image: original, format: 'JPEG', width: escala(ladoMaior, LADO_MAXIMO) });
  foto.thumb = _util._fileHelper.resizeImage({ image: original, format: 'JPEG', width: escala(ladoMaior, LADO_MINIATURA) });
}
