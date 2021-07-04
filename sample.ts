// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
let CollaboratorsTab
import _ from "lodash"
import PropTypes from "prop-types"

const R = React.createElement
export default CollaboratorsTab = (function () {
  CollaboratorsTab = class CollaboratorsTab extends React.Component {
    static initClass() {
      this.propTypes = {
        ctx: PropTypes.object.isRequired,
        onQueryMembers: PropTypes.func,
        members: PropTypes.array.isRequired,
        groupId: PropTypes.string.isRequired,
        isAdmin: PropTypes.bool.isRequired // Set to true if user is admin
      }
    }

    handleAddCollaborator = (value: any) => {
      // Only adding groups, so always set is_managed_by to false (never a user)
      const groupMember = { member: value, group: this.props.groupId, admin: false, is_managed_by: false }
      return this.props.ctx.db.remoteDb.group_members.upsert([groupMember], null, () => {
        return this.props.onQueryMembers()
      })
    }

    render() {
    }
  }
  CollaboratorsTab.initClass()
  return CollaboratorsTab
})()