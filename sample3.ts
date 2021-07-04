import _ from "lodash"
import PropTypes from "prop-types"
import React, { Component } from "react"
const R = React.createElement
import { UndoStack } from "mwater-visualization"
import { RadioButtonComponent } from "mwater-visualization"
import { CheckboxComponent } from "mwater-visualization"
import update from "update-object"
import { ExprUtils } from "mwater-expressions"
import { DateRangeComponent } from "mwater-visualization"
import { FilterExprComponent } from "mwater-expressions-ui"
import { ExprCleaner } from "mwater-expressions"
import { default as ReactSelect } from "react-select"
import ListColumnBuilder from "./ListColumnBuilder"
import DatasetSelectComponent from "./DatasetSelectComponent"
import DatasetManagerLinkComponent from "./DatasetManagerLinkComponent"
import DesignBuilder from "./DesignBuilder"
import { SubjectSelectComponent } from "mwater-common"

interface FiltersPaneComponentProps {
  schema: any
  dataSource: any
  user?: string
  groups?: any
  /** Portal context */
  ctx: any
  design: any
  onDesignChange: any
}

// Filters pane of the entities pane
export default class FiltersPaneComponent extends React.Component<FiltersPaneComponentProps> {
  constructor(props: any) {
    super(props)

    this.state = {
      undoStack: new UndoStack()
    }
  }

  componentWillReceiveProps(nextProps: any) {
    // Save on stack
    return this.setState({ undoStack: this.state.undoStack.push(nextProps.design) })
  }

  handleUndo = () => {
    const undoStack = this.state.undoStack.undo()

    // We need to use callback as state is applied later
    return this.setState({ undoStack }, () => this.props.onDesignChange(undoStack.getValue()))
  }

  handleRedo = () => {
    const undoStack = this.state.undoStack.redo()

    // We need to use callback as state is applied later
    return this.setState({ undoStack }, () => this.props.onDesignChange(undoStack.getValue()))
  }

  handleEntityTypeChange = (entityType: any) => {
    // Set entity type and reset columns and filters
    const design = new DesignBuilder(this.props.schema).createDefaultDesign(entityType)
    return this.props.onDesignChange(design)
  }

  handleOnlyMapBoundsChange = (value: any) => {
    return this.props.onDesignChange(update(this.props.design, { filters: { onlyMapBounds: { $set: value } } }))
  }

  handleTextChange = (ev: any) => {
    return this.props.onDesignChange(update(this.props.design, { filters: { text: { $set: ev.target.value } } }))
  }

  handleAdminChange = (admin: any) => {
    return this.props.onDesignChange(update(this.props.design, { filters: { admin: { $set: admin } } }))
  }

  handleCreatedOnChange = (createdOn: any) => {
    return this.props.onDesignChange(update(this.props.design, { filters: { createdOn: { $set: createdOn } } }))
  }

  handleModifiedOnChange = (modifiedOn: any) => {
    return this.props.onDesignChange(update(this.props.design, { filters: { modifiedOn: { $set: modifiedOn } } }))
  }

  handleDatasetChange = (dataset: any) => {
    return this.props.onDesignChange(update(this.props.design, { filters: { dataset: { $set: dataset } } }))
  }

  handleAccessChange = (level: any, value: any) => {
    let access = this.props.design.filters.access || ["Public", "Protected", "Private"]
    if (value) {
      access = _.union(access, [level])
    } else {
      access = _.without(access, level)
    }

    return this.props.onDesignChange(update(this.props.design, { filters: { access: { $set: access } } }))
  }

  handleExprChange = (expr: any) => {
    // Clean first
    const exprCleaner = new ExprCleaner(this.props.schema)
    expr = exprCleaner.cleanExpr(expr, { table: `entities.${this.props.design.entityType}` })

    return this.props.onDesignChange(update(this.props.design, { filters: { expr: { $set: expr } } }))
  }

  renderUndoRedo() {
    return R(
      "div",
      null,
      R(
        "a",
        {
          key: "undo",
          className: `btn btn-link btn-sm ${!this.state.undoStack.canUndo() ? "disabled" : ""}`,
          onClick: this.handleUndo
        },
        R("span", { className: "glyphicon glyphicon-triangle-left" }),
        " Undo"
      ),
      " ",
      R(
        "a",
        {
          key: "redo",
          className: `btn btn-link btn-sm ${!this.state.undoStack.canRedo() ? "disabled" : ""}`,
          onClick: this.handleRedo
        },
        R("span", { className: "glyphicon glyphicon-triangle-right" }),
        " Redo"
      )
    )
  }

  renderEntityType() {
    // Get all entity tables (tables with entities. in name)
    const entityTables = _.filter(this.props.schema.getTables(), (t) => t.id.match(/^entities\./))

    const options = _.map(
      _.filter(entityTables, (t) => !t.deprecated),
      (t) => ({
        label: ExprUtils.localizeString(t.name),
        value: t.id.split(".")[1]
      })
    )

    return R(
      SectionComponent,
      { title: "Data Source" },
      R(ReactSelect, {
        onChange: (option) => this.handleEntityTypeChange(option?.value),
        options,
        isClearable: false,
        value: _.findWhere(options, { value: this.props.design.entityType }) || null
      })
    )
  }

  renderText() {
    return R(
      SectionComponent,
      { title: "Search" },
      R("input", {
        type: "text",
        className: "form-control",
        value: this.props.design.filters.text,
        onChange: this.handleTextChange,
        placeholder: "Search..."
      })
    )
  }

  renderOnlyMapBounds() {
    // Only if has geometryExpr
    if (!this.props.design.map.geometryExpr) {
      return
    }

    return R(
      SectionComponent,
      { title: "Map Filter" },
      R(
        RadioButtonComponent,
        {
          key: "false",
          checked: !this.props.design.filters.onlyMapBounds,
          onChange: this.handleOnlyMapBoundsChange.bind(null, false)
        },
        "All Items"
      ),
      R(
        RadioButtonComponent,
        {
          key: "true",
          checked: this.props.design.filters.onlyMapBounds,
          onChange: this.handleOnlyMapBoundsChange.bind(null, true)
        },
        "Only Items Visible On Map"
      )
    )
  }

  renderAdmin() {
    return R(AdminComponent, {
      entityType: this.props.design.entityType,
      ctx: this.props.ctx,
      user: this.props.user,
      groups: this.props.groups,
      dataSource: this.props.dataSource,
      value: this.props.design.filters.admin,
      onChange: this.handleAdminChange
    })
  }

  renderCreatedOn() {
    return R(
      SectionComponent,
      { title: "Date Added" },
      R(DateRangeComponent, {
        value: this.props.design.filters.createdOn,
        onChange: this.handleCreatedOnChange,
        datetime: true
      })
    )
  }

  renderModifiedOn() {
    return R(
      SectionComponent,
      { title: "Date Last Modified" },
      R(DateRangeComponent, {
        value: this.props.design.filters.modifiedOn,
        onChange: this.handleModifiedOnChange,
        datetime: true
      })
    )
  }

  renderDataset() {
    return R(
      SectionComponent,
      { title: "Dataset" },
      R(DatasetSelectComponent, {
        value: this.props.design.filters.dataset,
        onChange: this.handleDatasetChange,
        ctx: this.props.ctx
      }),
      R(DatasetManagerLinkComponent, { ctx: this.props.ctx })
    )
  }

  renderAccess() {
    const createBox = (level: any, label: any) => {
      const checked = !this.props.design.filters.access || this.props.design.filters.access.includes(level)
      return R(CheckboxComponent, { checked, onChange: this.handleAccessChange.bind(null, level) }, label)
    }

    return R(
      SectionComponent,
      { title: "Access" },
      createBox("Public", "Public"),
      createBox("Protected", "Protected"),
      createBox("Private", "Private")
    )
  }

  renderExpr() {
    return R(
      SectionComponent,
      { title: "Advanced" },
      R(FilterExprComponent, {
        value: this.props.design.filters.expr,
        onChange: this.handleExprChange,
        schema: this.props.schema,
        dataSource: this.props.dataSource,
        table: `entities.${this.props.design.entityType}`
      })
    )
  }

  render() {
    return R(
      "div",
      { style: { padding: 10, paddingBottom: 200 } },
      this.renderUndoRedo(),
      this.renderEntityType(),
      this.renderText(),
      this.renderOnlyMapBounds(),
      this.renderAdmin(),
      this.renderCreatedOn(),
      this.renderModifiedOn(),
      this.renderDataset(),
      this.renderAccess(),
      this.renderExpr()
    )
  }
}

class SectionComponent extends Component {
  render() {
    return R(
      "div",
      { style: { marginBottom: 20 } },
      R("label", { className: "text-muted" }, this.props.title),
      R("div", { style: { marginLeft: 10 } }, this.props.children)
    )
  }
}

interface AdminComponentProps {
  /** entityType: PropTypes.string.isRequired */
  ctx: any
  user: string
  dataSource: any
  /** Current value */
  value?: string
  onChange: any
}

// Allow selection of admin. Anyone and
class AdminComponent extends React.Component<AdminComponentProps> {
  constructor(props: any) {
    super(props)

    this.state = {
      forceOther: false // True when other has been clicked but not filled yet
    }
  }

  handleAnyone = () => {
    this.setState({ forceOther: false })
    return this.props.onChange(null)
  }

  handleMe = () => {
    this.setState({ forceOther: false })
    return this.props.onChange(`user:${this.props.user}`)
  }

  handleOther = () => {
    // Force display of other and clear existing if user
    if (this.props.value === `user:${this.props.user}`) {
      this.props.onChange(null)
    }
    return this.setState({ forceOther: true })
  }

  render() {
    const isOther =
      (this.props.value != null && this.props.value !== `user:${this.props.user}`) || this.state.forceOther

    return R(
      SectionComponent,
      { title: "Managed By" },
      R(
        RadioButtonComponent,
        { key: "all", checked: this.props.value == null && !isOther, onClick: this.handleAnyone },
        "Anyone"
      ),
      R(
        RadioButtonComponent,
        { key: "me", checked: this.props.value === `user:${this.props.user}` && !isOther, onClick: this.handleMe },
        "Me"
      ),
      R(RadioButtonComponent, { key: "other", checked: isOther, onClick: this.handleOther }, "Other"),

      isOther
        ? R(SubjectSelectComponent, {
            key: "subject",
            value: this.props.value,
            onChange: this.props.onChange,
            db: this.props.ctx.db,
            apiUrl: this.props.ctx.apiUrl,
            login: this.props.ctx.login,
            groupsOnly: true,
            groupTypes: ["normal", "organization_head", "organization", "staff"],
            canManageEntities: true
          })
        : undefined
    )
  }
}
