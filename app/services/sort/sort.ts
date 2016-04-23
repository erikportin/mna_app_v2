/// <reference path="../../../typings/lodash/lodash.d.ts" />
import {Injectable} from 'angular2/core';
import * as _ from 'lodash';
import {TrackImpl} from "../../domain/trackImpl";
import {Album} from "../../domain/album";
import {Storage} from "../../services/storage/storage";

@Injectable()
export class Sort{
	storage: Storage;


	constructor(storage:Storage) {
		console.log('Sort.constructor');
		this.storage = storage;
	}

/*
	"Linearly weighted" - use a function like: 
	S = (w1 * F1) + (w2 * F2) + (w3 * F3), 
	where wx are arbitrarily
	assigned weights, and Fx are the values of the factors. You'd also want to normalize F (i.e. Fx_n = Fx / Fmax). ' +
	'I think this is kinda how Lucene search works.

	"Base-N weighted" - more like grouping than weighting, it's just a linear weighting where weights are increasing ' +
	'multiples of base-10 (a similar principle to CSS selector specificity), so that more important factors are ' +
	'significantly higher:  
	S = 1000 * F1 + 100 * F2 + 10 * F3 ....

	Estimated True Value (ETV) - this is apparently what Google Analytics introduced in their reporting, where the value
	of one factor influences (weights) another factor - the consequence being to sort on more "statistically significant"
	values. The link explains it pretty well, so here's just the equation:  
	S = (F2 / F2_max * F1) + ((1 - (F2 / F2_max)) * F1_avg), ' +
	'where F1 is the "more important" factor ("bounce rate" in the article), and F2 is the "significance modifying" factor ("visits" in the article).
 	http://www.seomoz.org/blog/build-your-own-weighted-sort

	Bayesian Estimate - looks really similar to ETV, this is how IMDb calculates their rating. See this StackOverflow
	post for explanation; equation: S = (F2 / (F2+F2_lim)) * F1 + (F2_lim / (F2+F2_lim)) × F1_avg, where Fx are the
	same as #3, and F2_lim is the minimum threshold limit for the "significance" factor (i.e. any value less
	than X shouldn't be considered).
 	http://stackoverflow.com/questions/1411199/what-is-a-better-way-to-sort-by-a-5-star-rating

 */
	sortToAlbums(tracks:Array<TrackImpl>):Promise<Array<Album>> {
		console.log('Sort.sortToAlbums', tracks);

		if(tracks.length == 0){
			return new Promise<Array<Album>>((resolve) => resolve([]))
		}

		return new Promise<Array<Album>>((resolve, reject) =>{
			Promise.all([
				this.storage.getPreferences(),
				this.storage.getIgnoreList()
			]).then(data => {
				let _preferences = data[0];
				let _ignoredAlbumList = data[1];

				let _limit = 1,
					_ratingAvg = tracks.reduce((prev, curr) => prev + curr.rating, 0) / tracks.length,
					_ratingMax = Math.max(...tracks.map(track => track.rating)),
					_playCountAvg = tracks.reduce((prev, curr) => prev + curr.playCount, 0) / tracks.length,
					_playCountMax = Math.max(...tracks.map(track => track.playCount));

				let _sortedAlbums = _.chain(tracks)
					.map(track => {
						let _limit = 1;
						let _playcount = track.playCount ? track.playCount + 1 : 1;
						let _rating = track.rating ? track.rating + 1 : 1;

						track.score = {
							bayesianEstimate: (_playcount / (_playcount + _limit)) * _rating + (_limit / (_playcount + _limit)) * _ratingAvg,
							estimatedTrueValue: (_playcount / _playCountMax * _rating) + ((1 - (_playcount / _playCountMax)) * _ratingAvg),
							baseNWeightedRatingPlayCount: 1000 * _rating + 100 * _playcount,
							baseNWeightedPlayCountRating: 1000 * _playcount + 100 * _rating
						};

						return track;
					})
					.groupBy('albumPersistentID')
					.map(tracks => new Album(tracks[0].albumPersistentID, tracks, _.some(_ignoredAlbumList, {'id': tracks[0].albumPersistentID})))
					//.sortBy(album => -album.length)
					.value();

				resolve(_sortedAlbums);

			}, (error) => {
				reject(error);
			})
		})
	}
}
