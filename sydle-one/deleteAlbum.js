/**
 * Método `deleteAlbum` da classe "Álbum" (Album, 6afdb6cfad623b2aff4f4844, pacote "Galeria") —
 * exclui um álbum pela aba "Álbuns" das Consultas do portal.
 * Acesso do método: EXPLICIT, Administrador e "Gestor de eventos". Contexto: OBJECT.
 *
 * Para só tirar da home sem perder as fotos, o caminho é o "Editar álbum" desmarcando "Publicado".
 *
 * Entrada (_input):
 *   { confirm }   precisa ser true
 */

const ALBUM_CLASS_ID = '6afdb6cfad623b2aff4f4844';

if (!_input || _input.confirm !== true) {
  throw new Error('Marque a confirmação para excluir o álbum.');
}
if (!_object || !_object._id) throw new Error('Álbum não encontrado.');

_utils.getMethod('_classId', ALBUM_CLASS_ID, '_delete')({ _id: _object._id });
