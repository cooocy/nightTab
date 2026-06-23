import { message } from '../../message';

import { data } from '../../data';
import { menu } from '../../menu';

import * as form from '../../form';

import { Button } from '../../button';
import { Alert } from '../../alert';
import { DropFile } from '../../dropFile';
import { Link } from '../../link';

import { Control_helperText } from '../../control/helperText';
import { Control_inputButton } from '../../control/inputButton';
import { Control_text } from '../../control/text';

import { node } from '../../../utility/node';
import { clearChildNode } from '../../../utility/clearChildNode';
import { complexNode } from '../../../utility/complexNode';

const dataSetting = {};

dataSetting.control = {
  restore: {},
  backup: {},
  clear: {},
  server: {}
};

dataSetting.serverFeedback = {
  render: (feedback, type, text) => {
    clearChildNode(feedback);
    feedback.appendChild(complexNode({
      tag: 'p',
      text: text,
      attr: [{ key: 'class', value: type === 'fail' ? 'small muted' : 'small' }]
    }));
    data.feedback.animation.set.render(feedback, type === 'fail' ? 'is-shake' : 'is-pop');
  }
};

dataSetting.restore = (parent) => {

  dataSetting.control.restore.restoreElement = new Control_inputButton({
    id: 'restore-data',
    type: 'file',
    buttonHideInput: true,
    labelText: message.get('menuContentDataRestoreFile'),
    inputButtonStyle: ['line'],
    action: () => {
      data.import.file({
        fileList: dataSetting.control.restore.restoreElement.input.files,
        feedback: dataSetting.control.restore.feedback,
        input: dataSetting.control.restore.restoreElement
      });
    }
  });

  dataSetting.control.restore.paste = new Button({
    text: message.get('menuContentDataRestoreClipboard'),
    style: ['line'],
    func: () => {
      data.import.paste({
        feedback: dataSetting.control.restore.feedback,
      });
    }
  });

  dataSetting.control.restore.restoreHelper = new Control_helperText({
    text: [message.get('menuContentDataRestoreHelperPara1')]
  });

  dataSetting.control.restore.feedback = form.feedback();

  data.feedback.clear.render(dataSetting.control.restore.feedback);

  data.feedback.empty.render(dataSetting.control.restore.feedback);

  dataSetting.control.restore.drop = new DropFile({
    heading: message.get('menuContentDataRestoreDrop'),
    dropAaction: () => {
      data.import.drop({
        fileList: dataSetting.control.restore.drop.files,
        feedback: dataSetting.control.restore.feedback,
      });
    },
    children: [
      dataSetting.control.restore.restoreElement.button,
      dataSetting.control.restore.paste.button
    ]
  });

  parent.appendChild(
    node('div', [
      dataSetting.control.restore.drop.wrap(),
      form.wrap({
        children: [
          dataSetting.control.restore.feedback
        ]
      }),
      dataSetting.control.restore.restoreHelper.wrap()
    ])
  );

};

dataSetting.backup = (parent) => {

  dataSetting.control.backup.export = new Button({
    text: message.get('menuContentDataBackupFile'),
    style: ['line'],
    func: () => {
      data.export();
    }
  });

  dataSetting.control.backup.copy = new Button({
    text: message.get('menuContentDataBackupClipboard'),
    style: ['line'],
    func: () => {
      navigator.clipboard.writeText(JSON.stringify(data.load()));
    }
  });

  dataSetting.control.backup.exportHelper = new Control_helperText({
    text: [
      message.get('menuContentDataBackupHelperPara1'),
      message.get('menuContentDataBackupHelperPara2')
    ]
  });

  parent.appendChild(
    node('div', [
      form.wrap({
        children: [
          form.inline({
            gap: 'small',
            equalGap: true,
            wrap: true,
            children: [
              dataSetting.control.backup.export.wrap(),
              dataSetting.control.backup.copy.wrap()
            ]
          })
        ]
      }),
      dataSetting.control.backup.exportHelper.wrap()
    ])
  );

};

dataSetting.server = (parent) => {

  dataSetting.control.server.url = new Control_text({
    id: 'server-url',
    labelText: message.get('menuContentDataServerUrl'),
    value: data.server.state.url,
    action: () => {
      data.server.state.url = dataSetting.control.server.url.text.value;
      data.server.saveSetting();
    }
  });

  dataSetting.control.server.username = new Control_text({
    id: 'server-username',
    labelText: message.get('menuContentDataServerUsername'),
    value: data.server.state.username,
    action: () => {
      data.server.state.username = dataSetting.control.server.username.text.value;
      data.server.saveSetting();
    }
  });

  dataSetting.control.server.password = new Control_text({
    type: 'password',
    id: 'server-password',
    labelText: message.get('menuContentDataServerPassword'),
    value: data.server.state.password,
    action: () => {
      data.server.state.password = dataSetting.control.server.password.text.value;
    }
  });

  dataSetting.control.server.upload = new Button({
    text: message.get('menuContentDataServerUpload'),
    style: ['line'],
    func: () => {
      dataSetting.control.server.upload.disable();
      dataSetting.control.server.download.disable();

      data.server.upload().then(() => {
        dataSetting.serverFeedback.render(
          dataSetting.control.server.feedback,
          'success',
          message.get('dataServerFeedbackUploadSuccess')
        );
      }).catch((error) => {
        dataSetting.serverFeedback.render(
          dataSetting.control.server.feedback,
          'fail',
          error.message
        );
      }).finally(() => {
        dataSetting.control.server.upload.enable();
        dataSetting.control.server.download.enable();
      });
    }
  });

  dataSetting.control.server.download = new Button({
    text: message.get('menuContentDataServerDownload'),
    style: ['line'],
    func: () => {
      dataSetting.control.server.upload.disable();
      dataSetting.control.server.download.disable();

      data.server.download().then((serverData) => {
        dataSetting.serverFeedback.render(
          dataSetting.control.server.feedback,
          'success',
          message.get('dataServerFeedbackDownloadSuccess')
        );

        menu.close();

        data.import.render(serverData);
      }).catch((error) => {
        dataSetting.serverFeedback.render(
          dataSetting.control.server.feedback,
          'fail',
          error.message
        );
      }).finally(() => {
        dataSetting.control.server.upload.enable();
        dataSetting.control.server.download.enable();
      });
    }
  });

  dataSetting.control.server.helper = new Control_helperText({
    text: [
      message.get('menuContentDataServerHelperPara1'),
      message.get('menuContentDataServerHelperPara2')
    ]
  });

  dataSetting.control.server.feedback = form.feedback();

  data.feedback.clear.render(dataSetting.control.server.feedback);

  data.feedback.empty.render(dataSetting.control.server.feedback);

  parent.appendChild(
    node('div', [
      dataSetting.control.server.url.wrap(),
      dataSetting.control.server.username.wrap(),
      dataSetting.control.server.password.wrap(),
      form.wrap({
        children: [
          form.inline({
            gap: 'small',
            equalGap: true,
            wrap: true,
            children: [
              dataSetting.control.server.upload.wrap(),
              dataSetting.control.server.download.wrap()
            ]
          })
        ]
      }),
      form.wrap({
        children: [
          dataSetting.control.server.feedback
        ]
      }),
      dataSetting.control.server.helper.wrap()
    ])
  );

};

dataSetting.clear = (parent) => {

  dataSetting.control.clear.all = new Button({
    text: message.get('menuContentDataClearAll'),
    style: ['line'],
    func: () => {
      menu.close();
      data.clear.all.render();
    }
  });

  dataSetting.control.clear.partial = new Button({
    text: message.get('menuContentDataClearPartial'),
    style: ['line'],
    func: () => {
      menu.close();
      data.clear.partial.render();
    }
  });

  dataSetting.control.clear.link = new Link({
    text: message.get('menuContentDataClearAlertLink'),
    href: '#menu-content-item-backup'
  });

  dataSetting.control.clear.alert = new Alert({
    iconName: 'warning',
    children: [
      node(`p:${message.get('menuContentDataClearAlertPara') || 'Text'}|class:small`),
      node('p|class:small', dataSetting.control.clear.link.link())
    ]
  });

  dataSetting.control.clear.helper = new Control_helperText({
    text: [
      message.get('menuContentDataClearHelperPara1'),
      message.get('menuContentDataClearHelperPara2')
    ]
  });

  parent.appendChild(
    node('div', [
      form.wrap({
        children: [
          form.inline({
            gap: 'small',
            equalGap: true,
            wrap: true,
            children: [
              dataSetting.control.clear.all.wrap(),
              dataSetting.control.clear.partial.wrap()
            ]
          })
        ]
      }),
      dataSetting.control.clear.alert.wrap(),
      dataSetting.control.clear.helper.wrap()
    ])
  );

};

export { dataSetting };
