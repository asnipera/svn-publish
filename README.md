# svnp
自动将指定目录或文件发布到远程svn仓库，目前仅支持Windows系统。

# cli
### svnp init
初始化配置文件、SVN仓库地址、SVN用户名、SVN密码

### svnp login
重新设置SVN用户名、SVN密码

### svnp
根据配置文件发布指定目录或文件到远程SVN仓库，提交信息默认为 "update"

### svnp -m test publish
根据配置文件发布指定目录或文件到远程SVN仓库，自定义提交信息为 "test publish"
