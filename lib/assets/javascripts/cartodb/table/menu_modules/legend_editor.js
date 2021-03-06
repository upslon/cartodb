
/* Widget for the Share Dialog */

cdb.admin.mod.LegendWidget = cdb.core.View.extend({

  className: "cartodb-legends",

  initialize: function() {

    this.map = this.options.map;
    this._setupTemplates();

    this.map.layers.bind("change", this.render, this);

  },

  _setupTemplates: function() {

    this.template = _.template('<%= count %> active legend<%= (count == 1) ? "" : "s" %>');

  },

  _getLegends: function() {

    var self = this;

    var legends = [];

    _.each(this.map.layers.models, function(layer) {

      if (layer.get("type") == 'layergroup') {

        var layerGroupView = self.mapView.getLayerByCid(layer.cid);

        for (var i = 0 ; i < layerGroupView.getLayerCount(); ++i) {
          var l = layerGroupView.getLayer(i);

          legends.push(new cdb.geo.ui.Legend({
            type: l.legend.get("type"),
            data: l.legend.items.toJSON()
          }));

        }

      } else if (layer.get("type") == "CartoDB") {

        legends.push(new cdb.geo.ui.Legend({
          type: layer.legend.get("type"),
          data: layer.legend.items.toJSON()
        }));

      }

    });

    return legends;
  },

  _getLegendsCount: function() {

    var count = 0;

    _.each(this.map.layers.models, function(layer) {

      if (layer.get("type") == 'layergroup') {

        var layerGroupView = this.mapView.getLayerByCid(layer.cid);

        for (var i = 0 ; i < layerGroupView.getLayerCount(); ++i) {

          var l = layerGroupView.getLayer(i);

          if (l.legend.items.length > 0 && l.get("visible") && l.legend.get("tpye") != null) {
              count++;
            }
          }

        } else if (layer.get("type") == "CartoDB" && layer.get("visible") && layer.legend.get("type") != null) {

          if (layer.legend.items.length > 0) {
            count++;
          }

        }

      }, this);

      return count;
    },

  render: function() {

    this.$el.html(this.template({ count: this._getLegendsCount() }));

    return this;

  }

});



cdb.admin.mod.LegendEditorCollection = Backbone.Collection.extend({ });

cdb.admin.mod.LegendEditorItem = cdb.core.View.extend({

  tagName: "li",

  events: {

    "click .remove": "_removeItem"

  },

  initialize: function() {

    this.template = this.options.template_name ? this.getTemplate(this.options.template_name) : this.getTemplate('table/menu_modules/legends/views/legend_item');
    this.add_related_model(this.model);
  },

  render: function() {

    this.$el.append(this.template(this.model.toJSON()));

    this._addEditInPlace();
    this._addColorForm();

    return this;
  },

  _removeItem: function(e) {
    e.preventDefault();
    e.stopPropagation();

    this.trigger('remove', this);

  },

  _addEditInPlace: function() {

    this.editInPlace = new cdb.admin.EditInPlace({
      observe: this.options.observe,
      model: this.model,
      stripHTML: true,
      el: this.$el.find(".input")
    });

    this.addView(this.editInPlace);

  },

  _addColorForm: function() {

    var view = new cdb.forms.Color({ model: this.model, property: 'value' });
    this.$el.find('span.field').append(view.render().el);
    this.addView(view);

  }

});

cdb.admin.mod.LegendEditor = cdb.core.View.extend({

    type: 'tool',
    buttonClass: 'legends_mod',
    className: 'legends_panel',

    initialize: function() {

      this.template = this.getTemplate('table/menu_modules/legends/views/legends');

      this._setupModel();
      this._setupPanes();
      this._setupBindings();
      this._setupStorage();
    },

    _setupModel: function() {
      this.add_related_model(this.model);
    },

    _setupPanes: function() {

      if (this.panes) this.panes.clean();

      this.panes = new cdb.ui.common.TabPane({
        activateOnClick: true
      });

      this.addView(this.panes);

    },

    _setupBindings: function() {

      this.add_related_model(this.options.dataLayer);

      this.options.dataLayer.bind("change:wizard_properties", this._onWizardChange, this);
      this.dataLayer = this.options.dataLayer;
      this.model.bind("change:items", this._saveState, this);
    },

    _saveState: function() {

      if (this.model.get("type") == 'custom') {
        this._saveItems();
      }

    },

    _setupStorage: function() {
      version = "_3.0";
      this.storageKey = this.dataLayer.get("table_name") + version;
      this.savedItems = new cdb.admin.localStorage(this.storageKey);
    },

    _saveItems: function() {
      this.savedItems.set(this.model.get("items"));
    },

    _getSavedItems: function() {
      return this.savedItems.get();
    },

    _loadSavedItems: function() {
      var items = this.savedItems.get();

      if (items) {
        this.model.items.reset(items);
      }
    },

    _shallResetPanes: function() {

      var legendType = this.model.get("type");
      var wizardType = this.options.dataLayer.get("wizard_properties").type;

      return (legendType != "null" && legendType != "custom" && legendType != wizardType);

    },

    _onPanelChange: function(name) {

      this._loadTab(name);

    },

    _activateTemplate: function(name) {

      _.each(this.options.legends, function(legend) {
        if (legend.name == "none" || legend.name == "custom" || legend.name == name) legend.enabled = true;
        else legend.enabled = false;
      });

    },

    _loadTab: function(type) {

      this.model.set("type", type);
      this.panes.active(type);

      var tab = this.panes.getActivePane();
      tab.render();
      tab.wizardProperties = this.dataLayer.get("wizard_properties");

      if (type == 'custom') {
        this._loadSavedItems();
      } else tab._calculateItems();

    },

    _reloadActiveTab: function() {

      var name = this.model.get("type") || "none";
      this.panes.active(name);

      var tab = this.panes.getActivePane();

      if (name && tab.model.get("type")) {

        tab.render();
        tab.refresh(this.model.items.models);

        if (this.options.dataLayer.get("wizard_properties")) {
          var type = this.options.dataLayer.get("wizard_properties").type;
          this._activateTemplate(name);
        }

      }

    },

    _onWizardChange: function() {

      var type = this.options.dataLayer.get("wizard_properties").type;

      if (!_.contains(this._getPanes(), type)) {

        type = "none";
        this.model.set("type", "none");
        this._activateTemplate(type);
        this._refreshTemplateCombo();
        this._loadTab(type);

      } else {

        this._activateTemplate(type);
        this._refreshTemplateCombo();
        this._loadTab(type);

      }

    },

    _getPanes: function() {

      var legends = this.options.legends;
      return _.pluck(legends, 'name');

    },

    _getEnabledPanes: function() {

      var legends = _.filter(this.options.legends, function(legend) {
        return legend["enabled"];
      });

      return _.pluck(legends, 'name');

    },

    _refreshTemplateCombo: function() {

      var legends = this._getEnabledPanes();
      this.templates.updateData(legends);

    },

    _renderTemplateCombo: function() {

      var legends = this._getEnabledPanes();

      if (this.templates) this.templates.clean();

      this.templates = new cdb.forms.Combo({
        property: 'type',
        extra: legends,
        model: this.model
      });

      this.templates.unbind("change", this._onPanelChange);
      this.templates.bind("change", this._onPanelChange, this);

      var $f = this.$('.fields');
      var li = $('<li>');

      li
        .append(this.templates.render().el)
        .append('<span>Template</span>');

      $f.append(li);

      this.addView(this.templates);
    },

    _capitalize: function(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    },

    _getExtraLegendNames: function() {

      var wizardProperties = this.dataLayer.get("wizard_properties");

      if (wizardProperties) {
        var wizardName = wizardProperties.type;
        return _.intersection(this.options.extraLegends, [wizardName]);
      } else {
        return null;
      }

    },

    /* Render panes */
    _renderPanes: function() {

      this.clearSubViews();

      _.each(_.pluck(this.options.legends, "name"), this._renderPane, this);

    },

    _renderPane: function(name) {

      var legendClass = this._capitalize(name + "Legend");

      var tab = new cdb.admin.mod[legendClass]({
        model: this.model,
        table_id: this.options.dataLayer.get("id"),
        wizardProperties: this.dataLayer.get("wizard_properties")
      });

      this.panes.addTab(name, tab);
      tab.$el.addClass(name);

    },

    render: function() {

      this.clearSubViews();
      this.$el.html(this.template);
      this.panes.setElement(this.$('.forms'));

      this._renderPanes();
      this._reloadActiveTab();

      if (this.options.dataLayer.get("wizard_properties")) {
        var type = this.options.dataLayer.get("wizard_properties").type;
        this._activateTemplate(type);
      }

      this._renderTemplateCombo();

      return this;
    }

});

/**
 * NoneLegend
 */
cdb.admin.mod.NoneLegend = cdb.core.View.extend({

  initialize: function() {

    this._setupTemplates();
    this.render();

  },

  _setupTemplates: function() {

    this.template           = this.getTemplate('table/menu_modules/legends/views/none_legend_pane');

  },

  _calculateItems: function() {

  },

  refresh: function() {

  },

  render: function() {
    this.clearSubViews();

    this.$el.html(this.template);
    this.$el.find(".no_content").show();

    return this;
  }

});





/**
 * CustomLegend
 */
cdb.admin.mod.CustomLegend = cdb.core.View.extend({

  _FILTER_NAME: "custom",

  events: {

    "click .add":    "_addItem"

  },


  initialize: function() {

    this._setupTemplates();
    this.wizardProperties = this.options.wizardProperties;

    this.items = this.model.items;
    this._bindItems();

  },

  _setupTemplates: function() {

    this.template           = this.getTemplate('table/menu_modules/legends/views/custom_legend_pane');
    this.item_template_name = 'table/menu_modules/legends/views/custom_legend_item'

  },

  refresh: function() { },

  _bindItems: function() {

    this.add_related_model(this.items);

    this.items.unbind("reset", this.render, this);
    this.items.bind("reset", this.render, this);
  },

  _calculateItems: function() {


  },

  _addItem: function(e) {
    e.preventDefault();
    e.stopPropagation();

    var item = new cdb.geo.ui.LegendItemModel({ name: "Untitled", value: "#cccccc" });
    this.items.add(item);
  },

  _renderItems: function() {

    if (this.items.length > 0) {
      this.$el.find(".no_content").hide();
      this.items.each(this._renderItem, this);
    } else {
      this.$el.find(".no_content").show();
    }

  },

  _renderItem: function(item) {

    var view = new cdb.admin.mod.LegendEditorItem({
      model: item,
      observe: "name",
      template_name: this.item_template_name
    });

    view.bind("remove", this._removeItem, this);

    this.$el.find("ul").append(view.render().$el);
    this.addView(view);

  },

  _removeItem: function(item) {
    this.items.remove(item.model);
  },

  render: function() {

    this.clearSubViews();

    this.$el.html(this.template);

    this._renderItems();

    return this;
  }

});
