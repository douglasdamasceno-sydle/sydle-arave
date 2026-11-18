/**
 * Scripts da classe "Formulário de álbum" (AlbumForm, 6afdb89cc5ea2162a762d5e3, pacote "Galeria"),
 * usada pelo serviço "Publicar fotos".
 *
 * O campo `mode` escolhe entre criar um álbum novo e adicionar fotos a um álbum existente.
 * No segundo caso o álbum é escolhido numa lista (campo `album`): ninguém redigita o nome,
 * e um erro de digitação não gera álbum duplicado.
 */

/* ===== _createDraft ===== */

if (!_object) return;
_object.mode = _object.mode || 'novo';

/* ===== _getMetadata ===== */

if (!_object) return;

const existente = _object.mode === 'existente';

['title', 'date', 'description', 'event'].forEach(campo => {
  _metadata.fields[campo].hidden = existente;
});
_metadata.fields.title.required = !existente;
_metadata.fields.date.required = !existente;

_metadata.fields.album.hidden = !existente;
_metadata.fields.album.required = existente;
