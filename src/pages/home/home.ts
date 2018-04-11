import { Component } from '@angular/core';
import { NavController, LoadingController, Platform, AlertController, Loading } from 'ionic-angular';
import { HttpClient } from '@angular/common/http';
import { Pro, DeployConfig, DeployInfo } from '@ionic/pro';
import { File } from '@ionic-native/file';


const APP_CHANNEL = 'Master';
const APP_ID = "15dd2668"
const CONTENT_CHANNEL = "Master";
const CONTENT_APP_ID = '11052544';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    public navCtrl: NavController,
    public loadingCtrl: LoadingController,    
    private platform: Platform,
    private http: HttpClient,
    private alertCtrl: AlertController,
    private file: File
  ) {
     
  }


  public async downloadAndUpdate() {
    let loading = this.loadingCtrl.create({
      content: "Please wait while we sign you in..."
    });
    loading.present();   
    const stat = await this.fauxLogin();
    loading.dismissAll();
    
    console.log(`Will try to download content`);
    let alert = this.alertCtrl.create({
      title: "Content Update",
      subTitle: "Press ok to start content download",
      buttons: [
        {
          text: 'Ok',
          handler: () => {
            this.downloadContent();
          }
        }
      ]
    });
    alert.present();
  }

  fauxLogin(): Promise<boolean> {
    return new Promise<boolean> ((res) => {
      setTimeout(()=>res(true), 2000);
    });
  }


  async downloadContent() {
    if(this.platform.is('core')) {
      console.log(`Faux download`);
      return;
    }
    const applicationDirectory = await this.file.resolveDirectoryUrl(this.file.applicationDirectory);
    const applicationStorageDirectory = await this.file.resolveDirectoryUrl(this.file.applicationStorageDirectory);
    const dataDirectory = await this.file.resolveDirectoryUrl(this.file.dataDirectory);
    const documentsDirectory = await this.file.resolveDirectoryUrl(this.file.documentsDirectory);
    
    console.log(` application dir ${applicationDirectory.toURL()}`);
    console.log(` applicationStorageDirectory dir ${applicationStorageDirectory.toURL()}`);
    console.log(` dataDirectory dir ${dataDirectory.toURL()}`);
    console.log(` documentsDirectory dir ${documentsDirectory.toURL()}`);


    let loading = this.loadingCtrl.create({
      content: "Please wait while we check for updates"
    });
    loading.present();   
    await this.checkChannel();
    const initialInfo: DeployInfo = await Pro.deploy.info();
    await this.performContentUpdate(loading);

    
  }


  async checkChannel() {
    try {
      const res = await Pro.deploy.info();
      console.log(`check channel ${res.channel} ${res.binary_version}`);      
    } catch (err) {
      
    }    
  }



  async performContentUpdate(loading: Loading) {
    await Pro.deploy.init({
      channel: CONTENT_CHANNEL,
      appId: CONTENT_APP_ID
    });

    try {
      const haveUpdate = await Pro.deploy.check();

      if (haveUpdate){        
        console.log(`There is some new content`);
        loading.dismiss();
        let alert = this.alertCtrl.create({
          title: "Content Update",
          subTitle: "We have some content to download. Press ok to start content download",
          buttons: [
            {
              text: 'Ok',
              handler: () => {
                this.downloadNewContent();
              }
            }
          ]
        });
        alert.present();
        
        
      } else {
        await this.resetToOriginal();
        loading.dismiss();
      }
    } catch (err) {
      // We encountered an error.
      // Here's how we would log it to Ionic Pro Monitoring while also catching:

      // Pro.monitoring.exception(err);
    }
  }


  async downloadNewContent() {
    let loading = this.loadingCtrl.create({
      content: "Downloading content....."
    });
    loading.present();   
    await Pro.deploy.download((progress) => {
      console.log(`Progress state ${progress}`);
    })
    await Pro.deploy.extract();
    loading.dismissAll();
    await this.resetToOriginal();
    
  }


  async copyContent(appUUID: string, contentUUID: string) {
    console.log(`Copying content from ${contentUUID} to ${appUUID}`);
    const appSupportDir = await this.file.resolveDirectoryUrl(`${this.file.applicationStorageDirectory}/Library/Application\\ Support/${contentUUID}/battery`);
    console.log(`Content battery dir ${appSupportDir.toURL()}`);
    this.file.copyDir(this.file.applicationStorageDirectory, `Library/Application\\ Support/${contentUUID}/battery`, `Library/Application\\ Support/${appUUID}/assets`, 'battery');
    this.file.copyDir(this.file.applicationStorageDirectory, `Library/Application\\ Support/${contentUUID}/stims`, `Library/Application\\ Support/${appUUID}/assets`, 'stims');
  }

  async resetToOriginal() {
    const initialInfo: DeployInfo = await Pro.deploy.info();
    const deployUUID = initialInfo.deploy_uuid;
    console.log(`Content dep[loyed UUID ${deployUUID}`);
    await Pro.deploy.init({
      channel: APP_CHANNEL,
      appId: APP_ID
    });
    await this.recheck();
    const resetInfo: DeployInfo = await Pro.deploy.info();
    console.log(`App dep[loyed UUID ${resetInfo.deploy_uuid}`);
    await this.copyContent(resetInfo.deploy_uuid, deployUUID);
  }


  async recheck() {
    try {
     await Pro.deploy.check();
    } catch (err) {
      
    }
  }

}
