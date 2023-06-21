import { Injectable } from '@angular/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { Foto } from './../models/foto.interface';

@Injectable({
  providedIn: 'root',
})
export class FotoService {
  // Lista das fotos que estão armazenadas no dispositivos
  fotos: Foto[] = [];
  // Cria uma variavel para armazenar o local fisico (pasta) das fotos
  private FOTO_ARMAZENAMENTO: string = 'fotos';

  constructor(private platform: Platform) {}

  public async carregarFotosSalvas() {
    // Recuperar as fotos em cache
    const listaFotos = await Preferences.get({ key: this.FOTO_ARMAZENAMENTO });
    this.fotos = JSON.parse(listaFotos.value as string) || [];

    // Se estiver rodando no navegador...
    if (!this.platform.is('hybrid')) {
      // Exibir a foto lendo-a no formato base64
      for (let foto of this.fotos) {
        // Ler os dados de cada foto salva no sistema de arquivos
        const readFile = await Filesystem.readFile({
          path: foto.filepath,
          directory: Directory.Data,
        });

        // Somente na plataforma da Web: Carregar a foto como dados base64
        foto.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  public async tirarFoto() {
    // Take a photo
    const fotoCapturada = await Camera.getPhoto({
      resultType: CameraResultType.Uri, // dados baseados em arquivos; oferece o melhor desempenho
      source: CameraSource.Camera, // tirar automaticamente uma nova foto com a cÃ¢mera
      quality: 50, // Deixar em 50 para não gerar um arquivo muito grande em câmeras boas.
    });

    const salvarArquivoFoto = await this.salvarFoto(fotoCapturada);

    // Adicionar nova foto Ã  matriz Fotos
    this.fotos.unshift(salvarArquivoFoto);

    // Armazenar em cache todos os dados da foto para recuperaÃ§Ã£o futura
    Preferences.set({
      key: this.FOTO_ARMAZENAMENTO,
      value: JSON.stringify(this.fotos),
    });
  }

  // Salvar imagem em um arquivo no dispositivo
  private async salvarFoto(foto: Photo) {
    // Converta a foto para o formato base64, exigido pela API do sistema de arquivos para salvar
    const base64Data = await this.readAsBase64(foto);

    // Gravar o arquivo no diretÃ³rio de dados
    const nomeArquivo = new Date().getTime() + '.jpeg';
    const arquivoSalvo = await Filesystem.writeFile({
      path: nomeArquivo,
      data: base64Data,
      directory: Directory.Data,
    });

    if (this.platform.is('hybrid')) {
      // Exiba a nova imagem reescrevendo o caminho 'file://' para HTTP
      // Detalhes: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: arquivoSalvo.uri,
        webviewPath: Capacitor.convertFileSrc(arquivoSalvo.uri),
      };
    } else {
      // Use o webPath para exibir a nova imagem em vez da base64, pois ela jÃ¡ estÃ¡ carregada na memÃ³ria
      return {
        filepath: nomeArquivo,
        webviewPath: foto.webPath,
      };
    }
  }

  // Leia a foto da cÃ¢mera no formato base64 com base na plataforma em que o aplicativo estÃ¡ sendo executado
  private async readAsBase64(foto: Photo) {
    // "hÃ­brido" detectarÃ¡ Cordova ou Capacitor
    if (this.platform.is('hybrid')) {
      // Ler o arquivo no formato base64
      const arquivo = await Filesystem.readFile({
        path: foto.path as string,
      });

      return arquivo.data;
    } else {
      // Obtenha a foto, leia-a como um blob e, em seguida, converta-a para o formato base64
      const resposta = await fetch(foto.webPath!);
      const blob = await resposta.blob();

      return (await this.convertBlobToBase64(blob)) as string;
    }
  }

  // Excluir a imagem, removendo-a dos dados de referÃªncia e do sistema de arquivos
  public async deletePicture(foto: Foto, posicao: number) {
    // Remover essa foto da matriz de dados de referÃªncia Fotos
    this.fotos.splice(posicao, 1);

    // Atualizar o cache da matriz de fotos sobrescrevendo a matriz de fotos existente
    Preferences.set({
      key: this.FOTO_ARMAZENAMENTO,
      value: JSON.stringify(this.fotos),
    });

    // excluir o arquivo de foto do sistema de arquivos
    const nomeArquivo = foto.filepath.substr(foto.filepath.lastIndexOf('/') + 1);
    await Filesystem.deleteFile({
      path: nomeArquivo,
      directory: Directory.Data,
    });
  }

  convertBlobToBase64 = (blob: Blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });

    async getBlob(foto: Foto) {
      // Busca o arquivo no File System
      const file = await this.readFile(foto);
      // Converte o arquivo para Blob
      const response = await fetch(file);
      // Retorna o Blob
      return await response.blob();
    }

    private async readFile(foto: Foto) {
      // If running on the web...
      if (!this.platform.is('hybrid')) {
        // Display the photo by reading into base64 format
        const readFile = await Filesystem.readFile({
          path: foto.filepath,
          directory: Directory.Data,
        });

        // Web platform only: Load the photo as base64 data
        foto.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }

      return foto.webviewPath as string;
    }
}
