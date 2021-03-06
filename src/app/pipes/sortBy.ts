import _ from "lodash";

import {Pipe, PipeTransform} from '@angular/core';
import {ListAlbum} from "../domain/listAlbum";

@Pipe({name: 'sortBy'})
export class SortByPipe implements PipeTransform {
    transform = (albums: Array<ListAlbum>, orderBy: string) => {
        return _.sortBy(albums, orderBy);
    }
}
