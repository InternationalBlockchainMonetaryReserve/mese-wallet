/**
 * @license
 * Copyright 2020
 * =========================================
 */

///
///
export class ImageCache {

  // Save Image to Cache
  public saveImage(url: string, callback: Function) {
    var imgxhr = new XMLHttpRequest();
    imgxhr.open("GET", url)
    imgxhr.responseType = "blob";
    imgxhr.onload = function () {

      if (imgxhr.status === 200) {
        var reader = new FileReader();

        reader.readAsDataURL(imgxhr.response);

        reader.onloadend = function () {
          chrome.storage.local.set({ Image: reader.result }, () => {
            callback(reader.result)
          });
        };
      }
    }

    imgxhr.send()
  }
}
export default ImageCache;
