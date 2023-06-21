import { Component, ComponentRef } from '@angular/core';
import { FotoService } from '../services/foto.service';
import { Foto } from '../models/foto.interface';
import { ActionSheetController, ModalController } from '@ionic/angular';
import { AiService } from '../services/ai.service';
import { LoadingController } from '@ionic/angular';
import { ModalPage } from '../modal/modal.page';
import { FaceModalPage } from '../face-modal/face-modal.page';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(    public fotoService: FotoService,
    public actionSheetController: ActionSheetController,
    public aiService: AiService,
    private loadingController: LoadingController,
    public modalController: ModalController) {}
  async ngOnInit() {
    await this.fotoService.carregarFotosSalvas();
  }

  public async showActionSheet(foto: Foto, position: number) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Fotos',
      buttons: [
        {
          text: 'Descrever a imagem',
          icon: 'eye',
          handler: () => {
            this.detalhesImagem(foto);
          },
        },
        {
          text: 'Objetos na Imagem',
          icon: 'pricetags',
          handler: () => {
            this.tagsImagem(foto);
          },
        },
        {
          text: 'Análise facial',
          icon: 'person-circle',
          handler: () => {
            this.deteccaoFacial(foto);
          },
        },
        {
          text: 'Delete',
          role: 'destructive',
          icon: 'trash',
          handler: () => {
            this.fotoService.deletePicture(foto, position);
          },
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          handler: () => {
            // Nothing to do, action sheet is automatically closed
          },
        },
      ],
    });
    await actionSheet.present();
  }

  async detalhesImagem(foto: Foto) {
    const loading = await this.loadingController.create({
      message: 'Analisando...',
    });
    await loading.present();

    const detalhes = await this.aiService.descreverImagem( await this.fotoService.getBlob(foto) );

    console.log(detalhes);
    await loading.dismiss();

    this.abrirModal(ModalPage, detalhes);
  }

  async tagsImagem(foto: Foto) {
    const loading = await this.loadingController.create({
      message: 'Analisando...',
    });
    await loading.present();

    const tags = await this.aiService.tagsImagem(
      await this.fotoService.getBlob(foto)
    );
    console.log(tags);
    await loading.dismiss();
    this.abrirModal(ModalPage, tags);
  }

  async deteccaoFacial(foto: Foto) {
    const loading = await this.loadingController.create({
      message: 'Analisando...',
    });
    await loading.present();

    const faces = await this.aiService.deteccaoFacial(
      await this.fotoService.getBlob(foto)
    );
    console.log(faces);
    await loading.dismiss();
    this.abrirModal(FaceModalPage, faces);
  }

  async abrirModal(pagina: any, variavel: any) {
    const modal = await this.modalController.create({
      component: pagina,
      componentProps: variavel,
    });
    return await modal.present();
  }

  tirarFoto() {
    this.fotoService.tirarFoto();
  }
}
