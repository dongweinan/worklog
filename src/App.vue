<script>
import { login } from '@/utils/api.js'

export default {
  onLaunch: function () {
    // 启动时做微信静默登录，换取 token
    login().catch(() => {
      // 登录失败由后续接口请求重试
    })
  },
  onShow: function () {},
  onHide: function () {},
}
</script>

<style>
/*每个页面公共css */
</style>
