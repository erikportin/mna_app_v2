import {Component} from '@angular/core';
import {Platform, ToastController, ModalController, ActionSheetController} from 'ionic-angular';

import {AlbumService} from "../../services/albumService";
import {DB} from '../../services/db/db';
import {Config} from "../../services/config/config";
import {Copy} from "../../services/copy/copy";
import {CopyLangImpl} from "../../services/copy/domain/copyLangImpl";

import {Settings} from '../../modals/settings/settings';
import {Lists} from '../../modals/lists/lists';
import {AlbumInfo} from '../../modals/albumInfo/albumInfo';

import {IteratorResultImpl as IteratorResult} from "../../domain/iteratorResultImpl";
import {ListType} from "../../domain/listType";
import {Album} from "../../domain/album";

@Component({
    selector: 'page-result',
    templateUrl: 'result.html',
    providers: [AlbumService, AlbumInfo]
})

export class ResultPage {
    private album: IteratorResult;
    private toastCtrl: ToastController;
    private modalCtrl: ModalController;
    private albumService: AlbumService;
    private db: DB;
    private error: string;
    private copy:CopyLangImpl;
    private retries = 0;

    private onAuthorizationStatusDenied(){
        if(this.retries < 3){
            this.retries++;
            setTimeout(() => {
                this.getAlbums()
            }, 5000)
        }
        else{
            this.error = this.copy.result_authorizationStatusDenied;
        }
    }

    private onSuccess(album: IteratorResult): void {
        this.error = null;
        this.album = album;

        if(!this.album.value){
            setTimeout(() => {
                this.getAlbums()
            }, 2000)
        }
    }

    private onError(error: string): void {
        if(error == 'MPMediaLibraryAuthorizationStatusDenied'){
            this.onAuthorizationStatusDenied()
        }
        else{
            this.error = error;
        }
    }

    private getAlbums(): void {
        this.error = null;
        this.album = null;
        this.albumService.getAlbums()
            .then(album => {
                    return this.onSuccess(album)
                },
                error => this.onError(error)
            );
    }

    private presentToast(type:ListType, album: Album) {
        let albumTitle = album.albumTitle || this.copy.result_unknown;
        let messageType = '';

        switch(type){
            case ListType.Owned:
                messageType = this.copy.result_ownedList;
                break;
            case ListType.Wanted:
                messageType = this.copy.result_wantedList;
                break;
            case ListType.Ignored:
                messageType = this.copy.result_ignoredList;
                break;
        }
        let toast = this.toastCtrl.create({
            position: 'top',
            message: this.copy.result_albumAdded(albumTitle, messageType),
            duration: 1500
        });
        toast.present();
    }

    constructor(public actionSheetCtrl: ActionSheetController, toastCtrl: ToastController, modalCtrl: ModalController, platform: Platform, albumService: AlbumService, db: DB, copy: Copy) {
        this.toastCtrl = toastCtrl;
        this.modalCtrl = modalCtrl;
        this.albumService = albumService;
        this.db = db;
        this.copy = copy.en;
        platform.ready().then(() => this.getAlbums())
    }

    getNextAlbum(): void {
        this.albumService.getNext()
            .then(album => this.onSuccess(album), error => this.onError(error))
    };

    getPrevAlbum(): void {
        this.albumService.getPrev()
            .then(album => this.onSuccess(album), error => this.onError(error))
    };

    toBase64Uri = (src: string): string => 'data:image/png;base64,' + src;

    showSettings(): void {
        let settingsModal = this.modalCtrl.create(Settings, null, Config.modalOptions);
        settingsModal.onDidDismiss(settingsParams => {
            if (settingsParams && (settingsParams.preferencesUpdated || settingsParams.listUpdated)) {
                this.getAlbums();
            }
        });

        settingsModal.present();
    }

    showLists(): void {
        let listModal = this.modalCtrl.create(Lists, null, Config.modalOptions);
        listModal.onDidDismiss(settingsParams => {
            if (settingsParams && settingsParams.listUpdated) {
                this.getAlbums();
            }
        });

        listModal.present();
    }

    showInfo(album: Album): void {
        let infoModal = this.modalCtrl.create(AlbumInfo, {album: album}, Config.modalOptions);
        infoModal.present();
    }

    showListActionSheet(album: IteratorResult) {
        let that = this;
        let actionSheet = this.actionSheetCtrl.create({
            title:  this.copy.result_addToListAction(album.value.albumTitle),
        });

        actionSheet.addButton({
            text: this.copy.result_iWant,
            handler: () => {
                that.presentToast(ListType.Wanted, album.value);
                that.albumService.addToList(ListType.Wanted, album)
                    .then(album => that.onSuccess(album), error => that.onError(error));
            }
        });

        actionSheet.addButton({
            text: this.copy.result_iOwn,
            handler: () => {
                that.presentToast(ListType.Owned, album.value);
                that.albumService.addToList(ListType.Owned, album)
                    .then(album => that.onSuccess(album), error => that.onError(error));
            }
        });

        actionSheet.addButton({
            text: this.copy.result_ignore,
            handler: () => {
                that.presentToast(ListType.Ignored, album.value);
                that.albumService.addToList(ListType.Ignored, album)
                    .then(album => that.onSuccess(album), error => that.onError(error));
            }
        });

        actionSheet.addButton({
            text: this.copy.result_cancel,
            handler: () => {
            }
        });

        actionSheet.present();
    }
}
