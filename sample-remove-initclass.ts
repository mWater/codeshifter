
export default DatagridDisplayComponent = (function () {
  DatagridDisplayComponent = class DatagridDisplayComponent extends AsyncLoadComponent {
    static initClass() {
      this.contextTypes = { apiUrl: PropTypes.string } // Legacy

      this.propTypes = {
        datagridId: PropTypes.string,
        login: PropTypes.object, // Should contain user and client
        share: PropTypes.string,
        showControls: PropTypes.bool, // True to show datagrid controls
        db: PropTypes.object, // Needed for row view popup
        error: PropTypes.func, // Error handler
        onRowClick: PropTypes.func, // Override default row click. Return true if handled, false if not
        titleElem: PropTypes.node, // Optional title element
        extraTitleButtonsElem: PropTypes.node, // Optional extra buttons
        useDirectDataSource: PropTypes.bool, // True to use direct data source to prevent caching
        apiUrl: PropTypes.string,

        filters: PropTypes.arrayOf(
          PropTypes.shape({
            table: PropTypes.string.isRequired, // id table to filter
            jsonql: PropTypes.object.isRequired // jsonql filter with {alias} for tableAlias
          })
        )
      }

      this.defaultProps = { showControls: true }
    }

    constructor(props: any) {
      super(props)
      this.state = {
        datagrid: null
      }
    }
  }
  DatagridDisplayComponent.initClass()
  return DatagridDisplayComponent
})()
