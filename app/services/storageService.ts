export  interface StorageService {
    getIgnoreList()
    addIgnoreListItem(id:any, name:any)
    deleteIgnoreListItem(id:any)
    getPreferences()
    setPreferences(key:any, value:any)
}
